// src/store/settings.store.ts
import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";

const STORE_PATH = "settings.json";

export interface Settings {
  wikiPath: string;
  provider: "openai" | "anthropic" | "google" | "custom";
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  maxTokensPerRequest: number;
  rateLimitRpm: number;
  autoSaveQueries: boolean;
  userName: string;
}

interface SettingsState extends Settings {
  isLoaded: boolean;
  setWikiPath: (path: string) => Promise<void>;
  setSettings: (settings: Partial<Settings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  isValid: () => boolean;
}

const defaultSettings: Settings = {
  wikiPath: "",
  provider: "openai",
  apiKey: "",
  model: "gpt-4o",
  customBaseUrl: "",
  maxTokensPerRequest: 8000,
  rateLimitRpm: 60,
  autoSaveQueries: true,
  userName: "Architect",
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,
  isLoaded: false,

  setWikiPath: async (path: string) => {
    set({ wikiPath: path });
    const store = await load(STORE_PATH);
    await store.set("wikiPath", path);
    await store.save();
  },

  setSettings: async (newSettings: Partial<Settings>) => {
    set((state) => ({ ...state, ...newSettings }));
    const store = await load(STORE_PATH);
    for (const [key, value] of Object.entries(newSettings)) {
      if (value !== undefined) {
        await store.set(key, value);
      }
    }
    await store.save();
  },

  loadSettings: async () => {
    try {
      const store = await load(STORE_PATH);
      const wikiPath = (await store.get<string>("wikiPath")) || "";
      const provider = (await store.get<Settings["provider"]>("provider")) || "openai";
      const apiKey = (await store.get<string>("apiKey")) || "";
      const model = (await store.get<string>("model")) || "gpt-4o";
      const customBaseUrl = (await store.get<string>("customBaseUrl")) || "";
      const maxTokensPerRequest = (await store.get<number>("maxTokensPerRequest")) ?? 8000;
      const rateLimitRpm = (await store.get<number>("rateLimitRpm")) ?? 60;
      const autoSaveQueries = (await store.get<boolean>("autoSaveQueries")) ?? true;
      const userName = (await store.get<string>("userName")) || "Architect";

      set({
        wikiPath,
        provider,
        apiKey,
        model,
        customBaseUrl,
        maxTokensPerRequest,
        rateLimitRpm,
        autoSaveQueries,
        userName,
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ isLoaded: true });
    }
  },

  isValid: () => {
    const { wikiPath, apiKey, model } = get();
    return !!(wikiPath && apiKey && model);
  },
}));
