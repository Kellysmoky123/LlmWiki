// src/llm/factory.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Settings } from "../store/settings.store";
import { Result, ErrorCode } from "../types/result";


export function buildChatModel(settings: Settings): Result<BaseChatModel> {
  if (!settings.apiKey || !settings.model) {
    return { 
      ok: false, 
      error: "Missing API Key or Model in settings", 
      code: ErrorCode.SETTINGS_MISSING 
    };
  }

  try {
    let model: BaseChatModel;

    switch (settings.provider) {
      case "openai":
        model = new ChatOpenAI({
          apiKey: settings.apiKey,
          modelName: settings.model,
          temperature: 0,
          maxRetries: 3,
          maxTokens: settings.maxTokensPerRequest,
        });
        break;

      case "anthropic":
        model = new ChatAnthropic({
          anthropicApiKey: settings.apiKey,
          modelName: settings.model,
          temperature: 0,
          maxRetries: 3,
          maxTokens: settings.maxTokensPerRequest,
        });
        break;

      case "google":
        model = new ChatGoogleGenerativeAI({
          apiKey: settings.apiKey,
          model: settings.model,
          temperature: 0,
          maxRetries: 3,
          maxOutputTokens: settings.maxTokensPerRequest,
        });
        break;

      case "custom":
        model = new ChatOpenAI({
          apiKey: settings.apiKey,
          modelName: settings.model,
          temperature: 0,
          maxRetries: 3,
          maxTokens: settings.maxTokensPerRequest,
          configuration: {
            baseURL: settings.customBaseUrl,
          },
        });
        break;

      default:
        return { 
          ok: false, 
          error: `Unsupported provider: ${settings.provider}`, 
          code: ErrorCode.SETTINGS_MISSING 
        };
    }

    return { ok: true, data: model };
  } catch (error) {
    return { 
      ok: false, 
      error: `Failed to build LLM: ${error}`, 
      code: ErrorCode.LLM_API_ERROR 
    };
  }
}
