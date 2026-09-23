import {
  AI_LIMITS,
  type AiContext,
  type AiError,
  type AiProvider,
  type CoachRequest,
  type ContentReference,
  type PlannerRequest,
  type ProviderResult,
  type TutorRequest,
} from "./contracts.ts";
import { contextToPromptData } from "./context.ts";
import { LEVELUP_SYSTEM_INSTRUCTIONS } from "./prompts.ts";
import {
  validateCoachRequest,
  validateCoachResult,
  validatePlannerRequest,
  validatePlannerResult,
  validateTutorRequest,
  validateTutorResult,
} from "./schemas.ts";
import {
  getWebGpuProvisionState,
  optInWebGpu,
  probeWebGpu,
  reportWebGpuProgress,
  resetWebGpuProvision,
  setWebGpuError,
  setWebGpuReady,
} from "./webgpu-provision.ts";

export const WEBGPU_MODEL = "SmolLM2-1.7B-Instruct-q4f16_1-MLC" as const;
export const WEBGPU_MAX_INPUT_CHARS = 4096 as const;

export interface WebGpuChatMessage {
  role: "system" | "user";
  content: string;
}

export interface WebGpuChatCompletion {
  choices: Array<{ message?: { content?: string } }>;
}

export interface WebGpuChatEngine {
  chat: {
    completions: {
      create: (options: {
        messages: WebGpuChatMessage[];
        response_format?: { type: "json_object" };
        temperature?: number;
        max_tokens?: number;
      }) => Promise<WebGpuChatCompletion>;
    };
  };
}

export type WebGpuEngineFactory = (
  model: string,
  config: { initProgressCallback: (report: { progress: number; text: string }) => void },
) => Promise<WebGpuChatEngine>;

export interface WebGpuProviderOptions {
  available?: boolean;
  engineFactory?: WebGpuEngineFactory;
}

function providerError(code: AiError["code"], message: string): ProviderResult<never> {
  return { ok: false, source: "webgpu", error: { code, message } };
}

function byteLength(value: string): number {
  return typeof TextEncoder === "undefined" ? value.length : new TextEncoder().encode(value).byteLength;
}

let enginePromise: Promise<WebGpuChatEngine> | null = null;
let factoryOverride: WebGpuEngineFactory | null = null;

async function defaultEngineFactory(
  model: string,
  config: { initProgressCallback: (report: { progress: number; text: string }) => void },
): Promise<WebGpuChatEngine> {
  const webllm = await import("@mlc-ai/web-llm");
  return webllm.CreateMLCEngine(model, {
    initProgressCallback: config.initProgressCallback,
  }) as unknown as WebGpuChatEngine;
}

async function ensureEngine(): Promise<WebGpuChatEngine> {
  const provision = getWebGpuProvisionState();
  if (!provision.optedIn || provision.status === "cancelled" || provision.status === "error") {
    throw new Error(provision.status === "cancelled" ? "webgpu-cancelled" : "webgpu-off");
  }
  if (enginePromise) return enginePromise;
  optInWebGpu();
  reportWebGpuProgress({ progress: 0, text: "Downloading the in-browser model. About 1 GB." });
  const create = factoryOverride ?? defaultEngineFactory;
  const task: Promise<WebGpuChatEngine> = create(WEBGPU_MODEL, {
    initProgressCallback: (report) => reportWebGpuProgress(report),
  }).then((engine) => {
    if (getWebGpuProvisionState().status === "cancelled") {
      throw new Error("webgpu-cancelled");
    }
    setWebGpuReady();
    return engine;
  });
  enginePromise = task;
  try {
    return await task;
  } catch (cause) {
    if (enginePromise === task) enginePromise = null;
    if (cause instanceof Error && cause.message === "webgpu-cancelled") {
      throw cause;
    }
    setWebGpuError({ code: "unavailable", message: "The in-browser model could not be started on this device." });
    throw cause;
  }
}

async function call<T>(
  operation: "planner" | "coach" | "tutor",
  request: unknown,
  context: AiContext,
  refs: ContentReference[],
  validate: (value: unknown) => T | null,
): Promise<ProviderResult<T>> {
  const user = JSON.stringify({
    operation,
    request,
    context: contextToPromptData(context),
    references: refs.slice(0, 2).map((reference) => ({ ...reference, trust: "reference-only" })),
  });
  const system = `${LEVELUP_SYSTEM_INSTRUCTIONS} Respond with a single JSON object and no other text.`;
  if (byteLength(user) + byteLength(system) > WEBGPU_MAX_INPUT_CHARS) {
    return providerError("invalid-request", "This request is too large for the in-browser model.");
  }
  let engine: WebGpuChatEngine;
  try {
    engine = await ensureEngine();
  } catch {
    return providerError("unavailable", "The in-browser WebGPU model is not ready on this device.");
  }
  try {
    const completion = await engine.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 384,
    });
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return providerError("invalid-response", "The in-browser model returned no structured result.");
    }
    if (byteLength(content) > AI_LIMITS.responseBytes) {
      return providerError("invalid-response", "The in-browser model response exceeded the safe size limit.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return providerError("invalid-response", "The in-browser model returned invalid JSON.");
    }
    const value = validate(parsed);
    if (!value) {
      return providerError("invalid-response", "The in-browser model returned a result that failed validation.");
    }
    return { ok: true, source: "webgpu", value };
  } catch {
    return providerError("network", "The in-browser model could not complete the request.");
  }
}

export function createWebGpuProvider(options: WebGpuProviderOptions = {}): AiProvider | null {
  if (options.engineFactory) factoryOverride = options.engineFactory;
  if (!(options.available ?? probeWebGpu())) return null;
  return {
    planner(request: PlannerRequest, context: AiContext, refs: ContentReference[]) {
      const valid = validatePlannerRequest(request);
      return valid
        ? call("planner", valid, context, refs, (value) => validatePlannerResult(value, "webgpu"))
        : Promise.resolve(providerError("invalid-request", "The planning request is not valid."));
    },
    coach(request: CoachRequest, context: AiContext, refs: ContentReference[]) {
      const valid = validateCoachRequest(request);
      return valid
        ? call("coach", valid, context, refs, validateCoachResult)
        : Promise.resolve(providerError("invalid-request", "The coach question is not valid."));
    },
    tutor(request: TutorRequest, context: AiContext, refs: ContentReference[]) {
      const valid = validateTutorRequest(request);
      return valid
        ? call("tutor", valid, context, refs, validateTutorResult)
        : Promise.resolve(providerError("invalid-request", "The tutor request is not valid."));
    },
  };
}

export async function startWebGpuModel(
  options: WebGpuProviderOptions = {},
): Promise<{ started: boolean; reason?: string }> {
  if (options.engineFactory) factoryOverride = options.engineFactory;
  if (!(options.available ?? probeWebGpu())) {
    resetWebGpuProvision();
    return { started: false, reason: "This browser does not support WebGPU." };
  }
  resetWebGpuProvision();
  optInWebGpu();
  try {
    await ensureEngine();
    return { started: true };
  } catch {
    return { started: false, reason: "The in-browser model could not be downloaded or started." };
  }
}

export function resetWebGpuEngine(): void {
  enginePromise = null;
  factoryOverride = null;
  resetWebGpuProvision();
}