# Local AI in LevelUp

LevelUp is a static GitHub Pages site. It has no server-side AI and does not send prompts, responses, saved study state, or content context to a remote AI provider.

## Optional Ollama setup

The Study Mode Coach, Planner, and Tutor can use Ollama running on the same computer as the browser. The app is locked to `llama3.1:latest`; there is no model or provider selector.

1. Install Ollama from [ollama.com](https://ollama.com/).
2. Start the Ollama app or local service.
3. Download the locked model using Ollama's own local workflow: `ollama pull llama3.1:latest`.
4. Open the public LevelUp site on that same computer and choose **Check again** in Study Mode.

The browser calls only the loopback endpoint `http://127.0.0.1:11434/api/chat` (or `localhost`). A development-only `NEXT_PUBLIC_LEVELUP_OLLAMA_URL` override is accepted only when it still points to a loopback Ollama `/api/chat` route. Network, cloud, LAN, and arbitrary remote URLs are rejected.

Public visitors cannot use the site owner's computer or Ollama process. Each visitor who wants model-powered help must run their own local Ollama. Everyone else can use the deterministic Coach, Planner, and Tutor fallback, which works without Ollama and is based only on the LevelUp content and state already present in that browser.

The app bounds requests and responses, uses a short timeout, validates structured JSON, does not retry, and does not persist raw prompts or full model responses. AI interactions are not sent to analytics. If Ollama is unavailable or returns invalid data, the UI says that the deterministic fallback was used.
