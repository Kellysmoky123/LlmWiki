// src/hooks/useIngest.ts
import { ingestAgent } from "../agents/ingest/graph";
import { extractSource } from "../extractors";
import { useSettingsStore } from "../store/settings.store";
import { useUIStore } from "../store/ui.store";
import { ensureWikiStructure } from "../wiki/writer";

export function useIngest() {
  const { ingest: state, setIngest, resetIngest } = useUIStore();

  const ingest = async (input: string) => {
    // Prevent concurrent ingests from same hook instance
    if (state.isIngesting) return;

    setIngest({ isIngesting: true, error: null, progress: "Extracting source content..." });

    try {
      const settings = useSettingsStore.getState();

      if (!settings.wikiPath) {
        setIngest({ error: "No wiki folder selected. Go to Settings.", isIngesting: false });
        return;
      }

      if (!settings.apiKey || !settings.model) {
        setIngest({ error: "No API key or model configured. Go to Settings.", isIngesting: false });
        return;
      }

      setIngest({ progress: "Initializing wiki structure..." });
      const ensureResult = await ensureWikiStructure(settings.wikiPath);
      if (!ensureResult.ok) {
        setIngest({ error: ensureResult.error, isIngesting: false });
        return;
      }

      setIngest({ progress: "Extracting content from source..." });
      const extractResult = await extractSource(input);
      if (!extractResult.ok) {
        setIngest({ error: extractResult.error, isIngesting: false });
        return;
      }

      setIngest({ progress: "Saving source and planning wiki pages..." });

      const config = { configurable: { thread_id: "ingest-" + Date.now() } };
      const initialState = {
        sourceText: extractResult.data.text,
        sourceType: extractResult.data.type,
        sourceTitle: extractResult.data.title,
        wikiPath: settings.wikiPath,
        sourceFile: "",
        sourceFileBasename: "",
        plan: [],
        writtenPages: [],
        status: "Starting...",
        error: null,
      };

      const finalState = await ingestAgent.invoke(initialState, config);

      if (finalState.error) {
        setIngest({ error: finalState.error, isIngesting: false });
      } else {
        const count = finalState.writtenPages?.length ?? 0;
        setIngest({ 
            progress: `✓ Done! Saved source + wrote ${count} wiki page${count !== 1 ? "s" : ""}.`,
            isIngesting: false 
        });
      }

    } catch (err) {
      console.error("Ingestion failed:", err);
      setIngest({ 
          error: err instanceof Error ? err.message : "Ingestion failed unexpectedly", 
          isIngesting: false 
      });
    }
  };

  return { 
      ingest, 
      isIngesting: state.isIngesting, 
      progress: state.progress, 
      error: state.error,
      reset: resetIngest
  };
}
