TXT: LLM PLAYGROUND — TRAE BUILDER PLAN (NO CODE)
GLOBAL RULES

Do not invent API keys or endpoints. Read from environment variables only.

All settings must be provider-agnostic at the UI layer; mapping to each provider happens in middleware.

On any validation failure or guardrail block, return a structured error string to the UI and do not call the LLM provider.

Append every user prompt (after prompt guard passes) to prompts.txt with timestamp and provider/model used.

ENV VARS (declare once, use everywhere)

OPENAI_API_KEY

GEMINI_API_KEY

GROQ_API_KEY

HF_API_KEY (Hugging Face Inference for guardrails)

MODEL SETTINGS (single, provider-agnostic contract)

temperature (0.0–2.0)

max_output_tokens (0–4096)

presence_penalty (-2.0–2.0)

frequency_penalty (-2.0–2.0)

system_prompt (string)

seed (integer, optional)

stop_sequences (array of strings, optional)

GUARDRAILS MODELS (Hugging Face Inference)

Prompt Safety: meta-llama/Llama-Prompt-Guard-2-86M

Response Safety: meta-llama/Llama-Guard-3-8B

If HF returns “unsafe” or an error → block with user-facing message: “⚠️ Blocked by Safety Guardrails”.

PART 1 — Project Scaffolding

Goal: Create a minimal full-stack app with API layer, middleware layer, and web UI.

Tasks

Create project llm-playground with:

API service (REST): /providers, /chat, /health

Middleware layer for safety checks and provider routing

Static file hosting for web UI

Local file storage capability for prompts.txt

Configure CORS for browser access.

Output

Running local service with /health returning “OK”.

Acceptance

Hitting /health returns OK (200).

Project has write access to create/append prompts.txt.

Fallback

If file write fails, surface “PROMPT_LOGGING_DISABLED” warning but keep API live.

PART 2 — Providers & Top Models

Goal: Provide a static list of 3 top models per provider (no external fetch).

Tasks

Define providers: openai, gemini, groq.

Attach exact model identifiers (no descriptions), choose any popular recent ones:

openai: gpt-4o, gpt-4o-mini, o4-mini

gemini: gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro

groq: llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768

Expose /providers to return:

provider id

display name

list of top 3 models (string ids)

note: no API calls happen here; it’s static config.

Output

/providers returns all three providers with their 3 models each.

Acceptance

Response is deterministic, same across runs, no external latency.

PART 3 — Unified Chat Contract (Request/Response)

Goal: Establish one POST contract to /chat.

Request fields

provider (enum: openai|gemini|groq)

model (string; must be one of the provider’s top 3)

messages (array of {role: user|assistant|system, content: string})

settings (object matching MODEL SETTINGS)

metadata (optional: {traceId?: string})

Response fields

status (success | blocked | error)

message (assistant string, present only when success)

reason (string when blocked or error)

usage (optional: {inputTokens?, outputTokens?})

Rules

If a system_prompt is supplied in settings, it must be included as the first system message in provider-specific mapping.

If stop_sequences present, apply to provider if supported; otherwise ignore silently.

Acceptance

/chat rejects missing or bad provider, model, or messages with a clear error string.

PART 4 — Parameter Mapping (Provider-Specific)

Goal: Map the unified settings into each provider’s dialect without provider docs in code; use these rules.

OpenAI mapping

temperature → temperature

max_output_tokens → max_tokens

presence_penalty → presence_penalty

frequency_penalty → frequency_penalty

seed → seed (if unsupported, ignore silently)

stop_sequences → stop

system_prompt → include as the first system message

Gemini mapping

temperature → temperature

max_output_tokens → max_output_tokens

presence_penalty → presence_penalty

frequency_penalty → frequency_penalty

seed → ignore if unsupported

stop_sequences → stop_sequences

system_prompt → include as system instruction

Groq mapping (OpenAI-style for chat)

temperature → temperature

max_output_tokens → max_tokens

presence_penalty → presence_penalty

frequency_penalty → frequency_penalty

seed → ignore if unsupported

stop_sequences → stop

system_prompt → first system message

Acceptance

For the same input request, each provider receives a payload with equivalent intent (same temperature, penalties, stops, etc., where supported).

PART 5 — Safety Guardrails Flow

Goal: Enforce prompt pre-check and response post-check.

Sequence

Receive /chat request.

Prompt Safety (pre-check):

Build a safety request to HF Prompt Guard using HF_API_KEY.

Input = concatenated user content (and system if relevant to intent).

If unsafe/uncertain or API error → respond status=blocked, reason="Prompt blocked by Safety Guardrails".

Log Prompt:

Append to prompts.txt in format:

ISO_TIMESTAMP | provider=model | temp=… | presence=… | frequency=… | seed=… | prompt="…"

Provider Call:

Route to chosen provider with mapped parameters.

Response Safety (post-check):

Send assistant text to HF Llama Guard.

If unsafe/uncertain or API error → respond status=blocked, reason="Response blocked by Safety Guardrails".

Return Success:

status=success, message=<assistant text>, optional usage if available.

Acceptance

If either guardrail flags, zero provider output is returned to the user.

PART 6 — Prompt Logging to prompts.txt

Goal: Persist all user prompts after passing prompt guard.

Rules

Append one line per prompt.

Include UTC ISO timestamp, provider, model, core settings, and the raw prompt (truncate at 4,000 chars if needed).

If file missing, create it.

If write fails, continue the chat but record a warning (not visible to end user).

Acceptance

After multiple chats, prompts.txt grows with well-formed lines.

PART 7 — Frontend (ChatGPT-style UI)

Goal: A simple, clean interface with three panes and voice I/O.

Layout

Left Sidebar:

Provider selector (OpenAI / Gemini / Groq)

Model selector (top 3 of chosen provider)

“New Chat” button

Chat history list (by date/time)

Center Chat:

Chat transcript bubbles

Message input box with:

“Mic” button (voice input on/off)

“Send”

Right Settings Panel:

System Prompt (multiline)

Temperature slider (0–2)

Output tokens slider (0–4096)

Presence penalty (-2 to 2)

Frequency penalty (-2 to 2)

Seed (integer)

Stop sequences (comma-separated)

Default Prompt Templates (buttons):

“Summarize”

“Translate”

“Improve Writing”

“Extract Key Points”

“Generate Outline”

Behaviors

Model list dynamically updates when provider changes.

Messages array retains the conversation.

On send:

Build unified request

Call /chat

Render assistant response or guardrail message

Acceptance

Provider+model change updates future sends only (doesn’t rewrite history).

Settings panel values are reflected in the next send.

PART 8 — Voice Input & Output

Goal: Enable microphone input → text; and assistant text → speech.

Voice Input

Use browser speech recognition (where available).

While recording, show “Listening…” state.

After recognition, place text into the input box (user can edit before sending).

Voice Output

Use browser speech synthesis to read assistant replies.

Provide a toggle in settings: “Read replies aloud”.

Acceptance

On supported browsers, talking → transcript appears in the input.

Assistant replies are spoken if toggle is on.

PART 9 — Chat History

Goal: Persist and restore chats.

Rules

Save each chat (title = first user message prefix, timestamp).

Local persistence (e.g., browser storage) is sufficient.

Selecting a chat loads its transcript and settings snapshot at send time.

“New Chat” resets transcript and keeps current provider+model unless changed.

Acceptance

Switching between chats restores their transcripts smoothly.

PART 10 — Default Prompt Templates

Goal: One-click insertion of common prompts.

Templates (insert into input box; user can edit):

Summarize: “Summarize the following text in 5 bullets with a final one-sentence takeaway.”

Translate: “Translate this text into English, preserving tone and idioms.”

Improve Writing: “Rewrite this to be concise, professional, and active voice.”

Extract Key Points: “List the top 5 key points and 3 risks.”

Generate Outline: “Create a detailed outline with H2/H3 headings.”

Acceptance

Clicking a template fills the input; no auto-send.

PART 11 — CI/CD: GitHub

Goal: Version control and auto-deployment hooks.

Tasks

Initialize Git repository and push to GitHub.

Add basic CI (lint/build/test steps are minimal, fast).

Protect main branch, require status checks before merge (optional).

Acceptance

Pushing to main triggers CI and produces a deployable artifact (for Vercel).

PART 12 — Deploy to Vercel (Trae → Vercel)

Goal: Single-click deploy with correct environment variables.

Tasks

Connect GitHub repo to Vercel.

Configure environment variables in Vercel Project:

OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, HF_API_KEY

Set build output to include both API routes and web assets.

Verify the public URL works:

/providers loads

Chat UI loads and can send a simple message (with guardrails enabled)

Acceptance

Public URL accessible; test message returns assistant content (or guardrail block).

PART 13 — Operational Constraints & Error Messages

Standardized errors (user-facing):

“Provider missing or invalid.”

“Model missing or invalid for selected provider.”

“No user message provided.”

“Prompt blocked by Safety Guardrails.”

“Response blocked by Safety Guardrails.”

“Provider request failed. Please try again.”

“Temporary capacity issue. Please retry.”

Non-user-facing logs (internal):

HF errors, provider timeouts, prompt logging failures, token limit exceeded.

Acceptance

All failures map to one of the standardized errors; no raw stack traces.

PART 14 — Test Plan (Run After Deploy)

Functional

Switch provider; model list updates.

Temperature extremes (0 and 2) change style of answers.

Presence/frequency penalties at -2 and +2 produce noticeable changes.

Stop sequences truncate as expected.

Seed used when supported; ignored silently otherwise.

Safety

Enter a clearly unsafe prompt → pre-check blocks.

Force a borderline response → post-check blocks.

Persistence

Multiple chats appear in history and restore correctly.

prompts.txt grew by the number of sent messages (local env).

Voice

Speech-to-text populates input on supported browsers.

Speech synthesis reads out replies when toggle on.

PART 15 — Trae Builder Feeding Strategy (Small Batches)

To avoid “Thinking limit reached,” feed one part per run:

Part 1 (scaffold)

Part 2 (providers)

Part 3 (chat contract)

Part 4 (parameter mapping)

Part 5 (guardrails flow)

Part 6 (prompt logging)

Part 7 (frontend layout)

Part 8 (voice I/O)

Part 9 (chat history)

Part 10 (templates)

Part 11 (GitHub)

Part 12 (Vercel deploy)

Part 13 (errors)

Part 14 (tests)

If Trae fails a part: re-run the same part with the exact same text; then proceed.

PART 16 — Non-Goals & Simplifications (for v1)

No multi-file uploads or attachments.

No streaming tokens (v2 can add incremental rendering).

No provider model auto-discovery; stick to the fixed three models each.

No server-side DB; local file for prompts and browser storage for history.