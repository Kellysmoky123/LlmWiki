// src/store/ui.store.ts
import { create } from "zustand";
import { SuggestedFix } from "../agents/lint/state";

interface IngestState {
  isIngesting: boolean;
  progress: string;
  error: string | null;
}

interface QueryState {
  isQuerying: boolean;
  progress: string;
  error: string | null;
  answer: string | null;
}

interface LintState {
  status: "idle" | "diagnosing" | "done" | "fixing" | "fixed" | "error";
  suggestedFixes: SuggestedFix[];
  reportMarkdown: string;
  fixResults: Array<{ fixId: string; targetFile: string; ok: boolean; error?: string }>;
  error: string | null;
  currentWikiIndex: string;
}

interface UIStore {
  // Ingest
  ingest: IngestState;
  setIngest: (state: Partial<IngestState>) => void;
  resetIngest: () => void;

  // Query
  query: QueryState;
  setQuery: (state: Partial<QueryState>) => void;
  resetQuery: () => void;

  // Lint
  lint: LintState;
  setLint: (state: Partial<LintState>) => void;
  resetLint: () => void;
}

const initialIngest: IngestState = {
  isIngesting: false,
  progress: "",
  error: null,
};

const initialQuery: QueryState = {
  isQuerying: false,
  progress: "",
  error: null,
  answer: null,
};

const initialLint: LintState = {
  status: "idle",
  suggestedFixes: [],
  reportMarkdown: "",
  fixResults: [],
  error: null,
  currentWikiIndex: "",
};

export const useUIStore = create<UIStore>((set) => ({
  ingest: initialIngest,
  setIngest: (state) => set((s) => ({ ingest: { ...s.ingest, ...state } })),
  resetIngest: () => set({ ingest: initialIngest }),

  query: initialQuery,
  setQuery: (state) => set((s) => ({ query: { ...s.query, ...state } })),
  resetQuery: () => set({ query: initialQuery }),

  lint: initialLint,
  setLint: (state) => set((s) => ({ lint: { ...s.lint, ...state } })),
  resetLint: () => set({ lint: initialLint }),
}));
