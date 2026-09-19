import {
  AI_LIMITS,
  type AiContext,
  type AiError,
  type AiProvider,
  type ContentReference,
  type ProviderResult,
} from "./contracts.ts";
import { contextToPromptData } from "./context.ts";
import { buildPromptParts } from "./prompts.ts";
import { validateCoachRequest, validateCoachResult, validatePlannerRequest, validatePlannerResult, validateTutorRequest, validateTutorResult } from "./schemas.ts";

interface RemoteProviderOptions {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
}

function endpointIsSafe(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"))) && url.pathname.length > 0;
  } catch {
    return false;
  }
}

function error(code: AiError["code"], message: string): ProviderResult<never> {
  return { ok: false, source: "remote", error: { code, message } };
}

export function configuredAiEndpoint(): string {
  return typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LEVELUP_AI_ENDPOINT ?? "" : "";
}

export function createRemoteProvider(options: RemoteProviderOptions): AiProvider | null {
  if (!endpointIsSafe(options.endpoint)) return null;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? AI_LIMITS.remoteTimeoutMs;
  const maxRequestBytes = options.maxRequestBytes ?? AI_LIMITS.requestBytes;
  const maxResponseBytes = options.maxResponseBytes ?? AI_LIMITS.responseBytes;

  async function call<T>(operation: "planner" | "coach" | "tutor", request: unknown, context: AiContext, refs: ContentReference[], validate: (value: unknown) => T | null): Promise<ProviderResult<T>> {
    const prompt = buildPromptParts(operation, request, context, refs);
    const payload = JSON.stringify({
      protocol: "levelup-ai.v1",
      operation,
      request,
      context: contextToPromptData(context),
      references: refs.slice(0, AI_LIMITS.maxReferences),
      prompt,
    });
    if (payload.length > maxRequestBytes) return error("invalid-request", "The AI request is too large.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(options.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: payload,
        signal: controller.signal,
      });
      const contentLength = response.headers.get("content-length");
      if (contentLength && Number(contentLength) > maxResponseBytes) return error("http", "The AI response is too large.");
      const text = await response.text();
      if (text.length > maxResponseBytes) return error("http", "The AI response is too large.");
      if (!response.ok) return error("http", "The remote AI service is unavailable.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return error("invalid-response", "The remote AI service returned invalid JSON.");
      }
      const body = parsed as { ok?: unknown; result?: unknown };
      if (body.ok !== true) return error("invalid-response", "The remote AI service did not return a valid result.");
      const value = validate(body.result);
      if (!value) return error("invalid-response", "The remote AI result failed validation.");
      return { ok: true, source: "remote", value: { ...value, ...(operation === "planner" ? { source: "remote" as const } : {}) } as T };
    } catch (cause) {
      return error(cause instanceof DOMException && cause.name === "AbortError" ? "timeout" : "network", "The remote AI service could not be reached.");
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    planner(request, context, refs) {
      const valid = validatePlannerRequest(request);
      return valid ? call("planner", valid, context, refs, (value) => validatePlannerResult(value, "remote")) : Promise.resolve(error("invalid-request", "The planning request is not valid."));
    },
    coach(request, context, refs) {
      const valid = validateCoachRequest(request);
      return valid ? call("coach", valid, context, refs, validateCoachResult) : Promise.resolve(error("invalid-request", "The coach question is not valid."));
    },
    tutor(request, context, refs) {
      const valid = validateTutorRequest(request);
      return valid ? call("tutor", valid, context, refs, validateTutorResult) : Promise.resolve(error("invalid-request", "The tutor request is not valid."));
    },
  };
}
