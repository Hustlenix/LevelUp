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
import {
  validateCoachRequest,
  validateCoachResult,
  validatePlannerRequest,
  validatePlannerResult,
  validateTutorRequest,
  validateTutorResult,
} from "./schemas.ts";

export const OLLAMA_MODEL = "llama3.1:latest" as const;
export const OLLAMA_DEFAULT_ENDPOINT = "http://127.0.0.1:11434/api/chat" as const;

export interface OllamaProviderOptions {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
}

export interface OllamaStatusOptions {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export type OllamaStatus = {
  state: "not-checked" | "ready" | "model-missing" | "unavailable" | "blocked";
  message: string;
};

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]" || normalized === "::1";
}

export function isLocalOllamaEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (url.protocol === "http:" || url.protocol === "https:")
      && isLoopbackHost(url.hostname)
      && !url.username
      && !url.password
      && url.pathname === "/api/chat";
  } catch {
    return false;
  }
}

export function configuredOllamaEndpoint(): string {
  const configured = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LEVELUP_OLLAMA_URL : undefined;
  return configured?.trim() || OLLAMA_DEFAULT_ENDPOINT;
}

function providerError(code: AiError["code"], message: string): ProviderResult<never> {
  return { ok: false, source: "ollama", error: { code, message } };
}

function isAbortError(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "name" in cause && (cause as { name?: unknown }).name === "AbortError";
}

function responseContent(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const message = (value as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return null;
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

function byteLength(value: string): number {
  return typeof TextEncoder === "undefined" ? value.length : new TextEncoder().encode(value).byteLength;
}

export function createOllamaProvider(options: OllamaProviderOptions): AiProvider | null {
  if (!isLocalOllamaEndpoint(options.endpoint)) return null;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? AI_LIMITS.ollamaTimeoutMs;
  const maxRequestBytes = options.maxRequestBytes ?? AI_LIMITS.requestBytes;
  const maxResponseBytes = options.maxResponseBytes ?? AI_LIMITS.responseBytes;

  async function call<T>(
    operation: "planner" | "coach" | "tutor",
    request: unknown,
    context: AiContext,
    refs: ContentReference[],
    validate: (value: unknown) => T | null,
  ): Promise<ProviderResult<T>> {
    const prompt = buildPromptParts(operation, request, context, refs);
    const payload = JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: JSON.stringify({
            request,
            context: contextToPromptData(context),
            references: refs.slice(0, AI_LIMITS.maxReferences),
          }),
        },
      ],
    });
    if (byteLength(payload) > maxRequestBytes) return providerError("invalid-request", "The local AI request is too large.");

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
      if (contentLength && Number(contentLength) > maxResponseBytes) return providerError("http", "The local AI response is too large.");
      const text = await response.text();
      if (byteLength(text) > maxResponseBytes) return providerError("http", "The local AI response is too large.");
      if (!response.ok) return providerError("http", "Ollama is unavailable on this device.");

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return providerError("invalid-response", "Ollama returned invalid JSON.");
      }
      const content = responseContent(parsed);
      if (!content) return providerError("invalid-response", "Ollama returned no structured result.");
      let result: unknown;
      try {
        result = JSON.parse(content);
      } catch {
        return providerError("invalid-response", "Ollama returned an unstructured result.");
      }
      const value = validate(result);
      if (!value) return providerError("invalid-response", "Ollama returned a result that failed validation.");
      return { ok: true, source: "ollama", value };
    } catch (cause) {
      return providerError(isAbortError(cause) ? "timeout" : "network", "Ollama could not be reached on this device.");
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    planner(request, context, refs) {
      const valid = validatePlannerRequest(request);
      return valid
        ? call("planner", valid, context, refs, (value) => validatePlannerResult(value, "ollama"))
        : Promise.resolve(providerError("invalid-request", "The planning request is not valid."));
    },
    coach(request, context, refs) {
      const valid = validateCoachRequest(request);
      return valid
        ? call("coach", valid, context, refs, validateCoachResult)
        : Promise.resolve(providerError("invalid-request", "The coach question is not valid."));
    },
    tutor(request, context, refs) {
      const valid = validateTutorRequest(request);
      return valid
        ? call("tutor", valid, context, refs, validateTutorResult)
        : Promise.resolve(providerError("invalid-request", "The tutor request is not valid."));
    },
  };
}

export async function checkOllamaStatus(options: OllamaStatusOptions): Promise<OllamaStatus> {
  if (!isLocalOllamaEndpoint(options.endpoint)) {
    return { state: "blocked", message: "Only Ollama running on this device is allowed." };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? AI_LIMITS.ollamaStatusTimeoutMs;
  const maxResponseBytes = options.maxResponseBytes ?? 12000;
  const tagsUrl = new URL(options.endpoint);
  tagsUrl.pathname = "/api/tags";
  tagsUrl.search = "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(tagsUrl.toString(), { headers: { Accept: "application/json" }, signal: controller.signal });
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > maxResponseBytes) return { state: "unavailable", message: "Ollama returned too much data to inspect safely." };
    const text = await response.text();
    if (byteLength(text) > maxResponseBytes || !response.ok) return { state: "unavailable", message: "Ollama is not ready on this device." };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { state: "unavailable", message: "Ollama returned an invalid status response." };
    }
    const models = parsed && typeof parsed === "object" && Array.isArray((parsed as { models?: unknown }).models)
      ? (parsed as { models: Array<{ name?: unknown; model?: unknown }> }).models
      : [];
    const installed = models.some((model) => model.name === OLLAMA_MODEL || model.model === OLLAMA_MODEL);
    return installed
      ? { state: "ready", message: `Local ${OLLAMA_MODEL} is ready.` }
      : { state: "model-missing", message: `Ollama is running, but ${OLLAMA_MODEL} is not installed.` };
  } catch {
    return { state: "unavailable", message: "Ollama is not reachable. The deterministic fallback is still available." };
  } finally {
    clearTimeout(timer);
  }
}
