### CodeScribe — AI assistant runtime notes

This repository is a small Flask single-file web app that forwards user-pasted code to a Gemini/Generative model and renders the model's markdown in the browser. The instructions below focus on the pieces an AI assistant needs to be productive editing or extending this project.

1. Project layout and entry points
   - `app.py` — single source of truth for server behavior. It configures the Gemini client, defines the `model` and exposes two routes:
     - `GET /` -> renders `templates/index.html`
     - `POST /document-code` -> accepts JSON { code: string } and returns `{ documentation: string }` (AI-generated markdown)
   - Frontend files live under `templates/` and `static/`:
      - `templates/index.html` uses `marked` (CDN) to convert markdown -> HTML.
      - `static/script.js` calls `/document-code` with JSON and injects the returned markdown into the element with id "results" using `marked.parse`.

2. Authentication & secrets
   - The app reads `GEMINI_API_KEY` from the `.env` file via `python-dotenv` (see `load_dotenv()` in `app.py`).
   - When editing authentication flows, keep changes in `app.py` and preserve the environment approach to avoid leaking keys.

3. Model usage patterns
   - The app constructs a single `genai.GenerativeModel(...)` with `system_instruction` and uses `model.start_chat(history=[])` then `chat_session.send_message(...)` to send user code.
   - Prompt and generation settings are defined at top of `app.py` (`GENERATION_CONFIG`, `SAFETY_SETTINGS`, `SYSTEM_INSTRUCTION`). If you adjust those, keep the same dict structure.

4. Request/response contract
   - Input: POST `/document-code` with header `Content-Type: application/json` and body `{ "code": "..." }`.
   - Output: JSON `{ "documentation": "<markdown>" }` on success, or `{ "error": "..." }` with appropriate HTTP status codes (400 for missing code, 500 on server error).

5. UI conventions and UX expectations
   - The element with id "results" expects Markdown (not HTML). The frontend does not sanitize returned Markdown — return Markdown only.
   - Loading indicator behavior is controlled in `static/script.js` (element id "loader"). Avoid long synchronous work on the main thread.

6. Helpful implementation examples in this repo
   - To add new endpoints follow the same pattern as `document_code` — read JSON via `request.get_json()`, validate, then return `jsonify(...)`.
   - To change how Markdown is presented, edit `templates/index.html` (includes `marked`) and `static/style.css` (dark theme variables and `.results-box` rules).

7. Tests / local run
   - Run locally with `python app.py` (app uses `app.run(debug=True)` at bottom).
   - Ensure `.env` contains `GEMINI_API_KEY` before starting; otherwise `app.py` raises an error at import-time.

8. Known limitations and guardrails
   - The app raises on missing `GEMINI_API_KEY` at import time — avoid moving key checks behind request handling unless you also add user-friendly error responses.
   - The frontend does not sanitize markdown/html returned by the model. Avoid returning HTML fragments or unsafe content from the model responses; prefer Markdown.

9. When changing dependencies
   - This repo does not include a dependency manifest. If you add packages, add a `requirements.txt` with pinned versions and update README with setup instructions.

If anything above is unclear or you want specific guidance (tests, CI, or reworking the model/session lifecycle), tell me which area to expand and I'll update this file.
