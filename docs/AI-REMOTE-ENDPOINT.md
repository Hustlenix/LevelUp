# LevelUp AI Remote Endpoint

The current LevelUp deployment is a static Next.js export on GitHub Pages. It cannot safely host a request-time `POST` handler or an OpenAI secret. Study Mode therefore uses a deterministic local Coach, Planner, and Tutor by default.

## Current behavior

- No endpoint configured: all AI actions run locally from the profile, progress, activity, roadmap, and generated LevelUp content already present in the browser.
- Endpoint configured but unavailable: the request is bounded and timed out, then the same local fallback runs. The UI labels the result as a local fallback.
- Endpoint configured and valid: the browser sends only the compact request/context/reference envelope to that public URL. It never sends an OpenAI key.

Configure the static frontend only with a public URL:

```text
NEXT_PUBLIC_LEVELUP_AI_ENDPOINT=https://your-server.example.com/v1/levelup-ai
```

The URL must use HTTPS in production. HTTP is accepted only for `localhost` and `127.0.0.1` development URLs.

## Endpoint contract

```text
POST /v1/levelup-ai
Content-Type: application/json

{
  "protocol": "levelup-ai.v1",
  "operation": "coach" | "planner" | "tutor",
  "request": { "...": "validated operation input" },
  "context": { "...": "compact LevelUp context" },
  "references": [
    {
      "id": "ch:chapter-slug",
      "title": "...",
      "excerpt": "...",
      "trust": "reference-only"
    }
  ]
}
```

The endpoint must return a small, validated envelope:

```json
{ "ok": true, "source": "remote", "result": {} }
```

For failures, return a safe public error without provider details or prompts:

```json
{ "ok": false, "error": "unavailable" }
```

## Server requirements

The future server, not this static repository, must:

1. Store `OPENAI_API_KEY` as a server-only secret. Never use `NEXT_PUBLIC_OPENAI_API_KEY`.
2. Select the OpenAI model from server configuration such as `LEVELUP_AI_MODEL`; do not accept an arbitrary model name from the browser.
3. Revalidate the operation request, context, references, and structured result server-side.
4. Build the authoritative system instructions on the server. Treat browser context and retrieved references as untrusted data.
5. Use official OpenAI structured outputs or equivalent schema-constrained responses.
6. Enforce authentication or an abuse-control policy, request/response body limits, rate limits, and a provider timeout.
7. Avoid logging prompts, reflections, notes, raw model responses, API keys, or full personal context.
8. Never execute code, shell commands, database operations, or privileged actions from model output.

The browser-side adapter in `lib/ai/remote-provider.ts` also validates the response and falls back locally when the envelope or result is invalid. That client validation is a second safety layer, not a replacement for server-side validation.
