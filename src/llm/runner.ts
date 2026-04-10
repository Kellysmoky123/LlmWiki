// src/llm/runner.ts
// 
// Uses the TauriClient for direct HTTP calls instead of Langchain model.invoke().
// This bypasses WebView CORS issues for all LLM providers (NVIDIA NIM, OpenAI, Anthropic, Google).

import { Result, ErrorCode } from "../types/result";
import { useSettingsStore } from "../store/settings.store";
import { callLLM } from "./tauriClient";

let lastRequestTime = Date.now();

export async function runPrompt(
  _model: unknown,  // kept for API compatibility but no longer used
  template: string, 
  vars: Record<string, string>
): Promise<Result<string>> {
  try {
    const settings = useSettingsStore.getState();

    // RPM throttle
    const rpm = settings.rateLimitRpm || 60;
    const minIntervalMs = Math.ceil(60000 / rpm);
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < minIntervalMs) {
      const delay = minIntervalMs - timeSinceLast;
      console.log(`[Rate Limiter] Waiting ${delay}ms (${rpm} RPM limit)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    lastRequestTime = Date.now();

    // Substitute template variables
    let processedPrompt = template;
    for (const [key, value] of Object.entries(vars)) {
      processedPrompt = processedPrompt.split(`{{${key}}}`).join(value);
    }

    // Call LLM via Tauri's Rust HTTP client (bypasses CORS completely)
    const result = await callLLM(settings, [
      { role: "user", content: processedPrompt }
    ]);

    return result;

  } catch (error) {
    console.error("[Runner] Unexpected error:", error);
    return {
      ok: false,
      error: `LLM Request failed: ${error}`,
      code: ErrorCode.LLM_API_ERROR,
    };
  }
}
