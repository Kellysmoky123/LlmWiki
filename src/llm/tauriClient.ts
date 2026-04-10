// src/llm/tauriClient.ts
// 
// Problem: Langchain's fetch() calls in Tauri's WebView fail with "Connection error"
// because the WebView's origin is tauri://localhost, which many API servers (including NVIDIA NIM)
// block via CORS. Langchain does not let us easily override fetch with Tauri's Rust HTTP client
// for streaming/non-streaming calls without body corruption.
//
// Solution: Bypass Langchain model invocation entirely. Make the raw OpenAI-compatible
// HTTP request ourselves using Tauri's native fetch (which runs in Rust, no CORS).
// This works for any OpenAI-compatible provider: OpenAI, NVIDIA NIM, Ollama, custom endpoints.

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Settings } from "../store/settings.store";
import { Result, ErrorCode } from "../types/result";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  error?: { message: string };
}

function getBaseUrl(settings: Settings): string {
  switch (settings.provider) {
    case "openai": return "https://api.openai.com/v1";
    case "anthropic": return "https://api.anthropic.com"; 
    case "google": return `https://generativelanguage.googleapis.com/v1beta`;
    case "custom": return settings.customBaseUrl || "http://localhost:11434/v1";
  }
}

export async function callLLM(
  settings: Settings,
  messages: ChatMessage[]
): Promise<Result<string>> {
  try {
    const baseUrl = getBaseUrl(settings);

    if (settings.provider === "anthropic") {
      return await callAnthropic(settings, messages, baseUrl);
    }

    if (settings.provider === "google") {
      return await callGoogle(settings, messages, baseUrl);
    }

    // OpenAI-compatible (openai + custom providers like NVIDIA NIM, Ollama)
    return await callOpenAICompat(settings, messages, baseUrl);

  } catch (error) {
    console.error("[TauriClient] Request failed:", error);
    return {
      ok: false,
      error: `LLM request failed: ${error}`,
      code: ErrorCode.LLM_API_ERROR,
    };
  }
}

async function callOpenAICompat(
  settings: Settings,
  messages: ChatMessage[],
  baseUrl: string
): Promise<Result<string>> {
  const url = `${baseUrl}/chat/completions`;

  const body = JSON.stringify({
    model: settings.model,
    messages,
    max_tokens: settings.maxTokensPerRequest || 4096,
    temperature: 0,
    stream: false,
  });

  const response = await tauriFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`,
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      error: `API error ${response.status}: ${text.slice(0, 200)}`,
      code: ErrorCode.LLM_API_ERROR,
    };
  }

  const data: OpenAIResponse = JSON.parse(text);
  if (data.error) {
    return { ok: false, error: data.error.message, code: ErrorCode.LLM_API_ERROR };
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  return { ok: true, data: content };
}

async function callAnthropic(
  settings: Settings,
  messages: ChatMessage[],
  baseUrl: string
): Promise<Result<string>> {
  const url = `${baseUrl}/v1/messages`;

  const body = JSON.stringify({
    model: settings.model,
    max_tokens: settings.maxTokensPerRequest || 4096,
    messages: messages.filter(m => m.role !== "system"),
    system: messages.find(m => m.role === "system")?.content,
  });

  const response = await tauriFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    return { ok: false, error: `Anthropic API error ${response.status}: ${text.slice(0, 200)}`, code: ErrorCode.LLM_API_ERROR };
  }

  const data = JSON.parse(text);
  const content = data.content?.[0]?.text ?? "";
  return { ok: true, data: content };
}

async function callGoogle(
  settings: Settings,
  messages: ChatMessage[],
  baseUrl: string
): Promise<Result<string>> {
  const url = `${baseUrl}/models/${settings.model}:generateContent?key=${settings.apiKey}`;

  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  const body = JSON.stringify({ contents });

  const response = await tauriFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    return { ok: false, error: `Google API error ${response.status}: ${text.slice(0, 200)}`, code: ErrorCode.LLM_API_ERROR };
  }

  const data = JSON.parse(text);
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { ok: true, data: content };
}
