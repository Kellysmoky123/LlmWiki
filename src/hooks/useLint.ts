// src/hooks/useLint.ts
import { lintDiagnoseAgent, lintFixAgent } from "../agents/lint/graph";
import { SuggestedFix } from "../agents/lint/state";
import { useSettingsStore } from "../store/settings.store";
import { useUIStore } from "../store/ui.store";

export function useLint() {
  const { wikiPath } = useSettingsStore();
  const { lint: state, setLint, resetLint } = useUIStore();

  /** Phase A: Run the full wiki diagnosis */
  const runDiagnosis = async () => {
    if (!wikiPath) {
      setLint({ error: "Wiki path not configured. Go to Settings.", status: "error" });
      return;
    }
    
    // Avoid double diagnosis
    if (state.status === "diagnosing") return;

    setLint({ 
        status: "diagnosing", 
        error: null, 
        suggestedFixes: [], 
        reportMarkdown: "" 
    });

    try {
      const result = await lintDiagnoseAgent.invoke({
        wikiPath: wikiPath,
        allPagesContent: "",
        allPagePaths: [],
        wikiIndex: "",
        suggestedFixes: [],
        reportMarkdown: "",
        status: "",
        error: null,
      });
      
      setLint({ 
        suggestedFixes: result.suggestedFixes ?? [],
        reportMarkdown: result.reportMarkdown ?? "",
        currentWikiIndex: result.wikiIndex ?? "",
        status: "done"
      });
    } catch (e) {
      setLint({ error: String(e), status: "error" });
    }
  };

  /** Phase B: Apply the user-approved subset of fixes */
  const applyFixes = async (approvedFixes: SuggestedFix[], userInstructions: string) => {
      if (!wikiPath || state.status === "fixing") return;

      setLint({ status: "fixing", error: null });

      try {
        const result = await lintFixAgent.invoke({
          wikiPath: wikiPath,
          approvedFixes,
          userInstructions,
          wikiIndex: state.currentWikiIndex,
          fixResults: [],
          status: "",
          error: null,
        });
        setLint({ fixResults: result.fixResults ?? [], status: "fixed" });
      } catch (e) {
        setLint({ error: String(e), status: "error" });
      }
    };

  return { 
      status: state.status, 
      suggestedFixes: state.suggestedFixes, 
      reportMarkdown: state.reportMarkdown, 
      fixResults: state.fixResults, 
      error: state.error, 
      runDiagnosis, 
      applyFixes,
      reset: resetLint
  };
}
