// src/store/settings.store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettingsStore } from "./settings.store";

// Mock Tauri Store
const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn().mockResolvedValue(mockStore),
}));

describe("Settings Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state manually
    useSettingsStore.setState({
      wikiPath: "",
      provider: "openai",
      apiKey: "",
      model: "gpt-4o",
      customBaseUrl: "",
      maxTokensPerRequest: 8000,
      autoSaveQueries: true,
      isLoaded: false,
    });
  });

  it("initializes with empty/default values on first run", () => {
    const state = useSettingsStore.getState();
    expect(state.wikiPath).toBe("");
    expect(state.apiKey).toBe("");
    expect(state.provider).toBe("openai");
    expect(state.isLoaded).toBe(false);
  });

  it("setWikiPath() updates state and persists to Tauri store", async () => {
    const store = useSettingsStore.getState();
    await store.setWikiPath("/new/path");
    
    expect(useSettingsStore.getState().wikiPath).toBe("/new/path");
    expect(mockStore.set).toHaveBeenCalledWith("wikiPath", "/new/path");
    expect(mockStore.save).toHaveBeenCalled();
  });

  it("setSettings() updates state and persists to Tauri store", async () => {
    const store = useSettingsStore.getState();
    await store.setSettings({ apiKey: "test-key", model: "test-model" });
    
    expect(useSettingsStore.getState().apiKey).toBe("test-key");
    expect(useSettingsStore.getState().model).toBe("test-model");
    expect(mockStore.set).toHaveBeenCalledWith("apiKey", "test-key");
    expect(mockStore.set).toHaveBeenCalledWith("model", "test-model");
    expect(mockStore.save).toHaveBeenCalled();
  });

  it("loadSettings() restores previously saved values on app restart", async () => {
    mockStore.get.mockImplementation((key) => {
      const values: Record<string, any> = {
        wikiPath: "/saved/path",
        provider: "anthropic",
        apiKey: "saved-key",
        model: "claude-3",
      };
      return Promise.resolve(values[key] || null);
    });

    const store = useSettingsStore.getState();
    await store.loadSettings();

    const state = useSettingsStore.getState();
    expect(state.wikiPath).toBe("/saved/path");
    expect(state.provider).toBe("anthropic");
    expect(state.apiKey).toBe("saved-key");
    expect(state.model).toBe("claude-3");
    expect(state.isLoaded).toBe(true);
  });

  it("validation works: empty wikiPath returns false", () => {
    useSettingsStore.setState({ wikiPath: "", apiKey: "key", model: "model" });
    expect(useSettingsStore.getState().isValid()).toBe(false);
  });

  it("validation works: non-empty required fields returns true", () => {
    useSettingsStore.setState({ wikiPath: "/path", apiKey: "key", model: "model" });
    expect(useSettingsStore.getState().isValid()).toBe(true);
  });
});
