// src/hooks/useQuery.ts
import { queryAgent } from "../agents/query/graph";
import { useSettingsStore } from "../store/settings.store";
import { useUIStore } from "../store/ui.store";

export function useQuery() {
  const { query: state, setQuery, resetQuery } = useUIStore();

  const ask = async (question: string) => {
    if (state.isQuerying) return;

    setQuery({ 
        isQuerying: true, 
        error: null, 
        answer: null, 
        progress: "Initializing query agent..." 
    });

    try {
      const { wikiPath } = useSettingsStore.getState();
      
      const config = { configurable: { thread_id: "query-" + Date.now() } };
      const initialState = {
        question,
        wikiPath,
        status: "Searching wiki...",
        relevantPages: [],
        context: "",
        answer: "",
        savedPath: null,
      };

      const finalState = await queryAgent.invoke(initialState, config);

      if (finalState.error) {
        setQuery({ error: finalState.error, isQuerying: false });
      } else {
        setQuery({ 
            answer: finalState.answer,
            progress: finalState.savedPath ? `Saved to ${finalState.savedPath}` : "Answer generated",
            isQuerying: false
        });
      }

    } catch (err) {
      console.error("Query failed:", err);
      setQuery({ 
          error: err instanceof Error ? err.message : "Query failed unexpectedly", 
          isQuerying: false 
      });
    }
  };

  return { 
      ask, 
      isQuerying: state.isQuerying, 
      progress: state.progress, 
      error: state.error, 
      answer: state.answer,
      reset: resetQuery
  };
}
