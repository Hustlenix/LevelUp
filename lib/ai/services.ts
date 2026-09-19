import {
  type AiContext,
  type AiProvider,
  type AiServiceResult,
  type CoachRequest,
  type CoachResult,
  type ContentReference,
  type DailyPlan,
  type PlannerRequest,
  type TutorRequest,
  type TutorResult,
} from "./contracts.ts";
import { createLocalProvider } from "./local-provider.ts";
import { configuredOllamaEndpoint, createOllamaProvider } from "./ollama-provider.ts";

interface AiServiceOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createAiServices(options: AiServiceOptions = {}) {
  const local = createLocalProvider();
  const ollama: AiProvider | null = createOllamaProvider({
    endpoint: options.endpoint ?? configuredOllamaEndpoint(),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
  });

  async function withFallback<TRequest, TResult>(
    method: "planner" | "coach" | "tutor",
    request: TRequest,
    context: AiContext,
    refs: ContentReference[],
  ): Promise<AiServiceResult<TResult>> {
    if (ollama) {
      const result = await ollama[method](request as never, context, refs);
      if (result.ok) return result as AiServiceResult<TResult>;
    }
    const localResult = await local[method](request as never, context, refs);
    if (!localResult.ok) return localResult as AiServiceResult<TResult>;
    return {
      ...localResult,
      note: ollama
        ? "Ollama was unavailable; the deterministic fallback generated this result from saved LevelUp state."
        : "Ollama was not available; the deterministic fallback generated this result from saved LevelUp state.",
      fallbackReason: ollama ? "ollama-unavailable" : "no-ollama",
    } as AiServiceResult<TResult>;
  }

  return {
    planner: (request: PlannerRequest, context: AiContext, refs: ContentReference[]) => withFallback<PlannerRequest, DailyPlan>("planner", request, context, refs),
    coach: (request: CoachRequest, context: AiContext, refs: ContentReference[]) => withFallback<CoachRequest, CoachResult>("coach", request, context, refs),
    tutor: (request: TutorRequest, context: AiContext, refs: ContentReference[]) => withFallback<TutorRequest, TutorResult>("tutor", request, context, refs),
  };
}
