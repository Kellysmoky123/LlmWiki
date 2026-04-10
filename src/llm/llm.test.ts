import { describe, it, expect, vi } from "vitest";
import { buildChatModel } from "./factory";
import { runPrompt } from "./runner";
import { Settings } from "../store/settings.store";

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn(),
}));
vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: vi.fn(),
}));
vi.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: vi.fn(),
}));

describe("LLM Factory", () => {
  it("returns error if API key is missing", () => {
    const settings = { apiKey: "", model: "gpt-4o", provider: "openai" } as Settings;
    const result = buildChatModel(settings);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SETTINGS_MISSING");
    }
  });

  it("returns error if model is missing", () => {
    const settings = { apiKey: "key", model: "", provider: "openai" } as Settings;
    const result = buildChatModel(settings);
    expect(result.ok).toBe(false);
  });
});

describe("LLM Runner", () => {
  it("replaces placeholders correctly", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "Hi Bob" })
    } as any;

    const template = "Hello {{name}}";
    const vars = { name: "Bob" };

    const result = await runPrompt(mockModel, template, vars);
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(mockModel.invoke).toHaveBeenCalled();
        const callArgs = mockModel.invoke.mock.calls[0][0];
        expect(callArgs[0].content).toBe("Hello Bob");
    }
  });

  it("handles multiple placeholders", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "done" })
    } as any;

    const template = "{{greeting}} {{name}}!";
    const vars = { greeting: "Hi", name: "Alice" };

    await runPrompt(mockModel, template, vars);
    const callArgs = mockModel.invoke.mock.calls[0][0];
    expect(callArgs[0].content).toBe("Hi Alice!");
  });
});
