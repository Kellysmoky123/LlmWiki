// src/agents/lint/state.ts
import { Annotation } from "@langchain/langgraph";

export interface SuggestedFix {
  id: string;
  type: "orphan" | "contradiction" | "broken_link" | "gap" | "formatting";
  description: string;
  targetFiles: string[];
  proposedChange: string;
}

// Phase A: Diagnosis state
export const LintDiagnoseStateAnnotation = Annotation.Root({
  wikiPath: Annotation<string>,

  // Populated during Phase A
  allPagesContent: Annotation<string>,    // concatenated dump for LLM
  allPagePaths: Annotation<string[]>,     // array of relative paths
  wikiIndex: Annotation<string>,
  suggestedFixes: Annotation<SuggestedFix[]>,
  reportMarkdown: Annotation<string>,

  status: Annotation<string>,
  error: Annotation<string | null>,
});

// Phase B: Auto-Fix state — initialized from UI after user approval
export const LintFixStateAnnotation = Annotation.Root({
  wikiPath: Annotation<string>,
  approvedFixes: Annotation<SuggestedFix[]>,
  userInstructions: Annotation<string>,  // global custom instructions from textarea
  wikiIndex: Annotation<string>,         // Carry over from diagnosis to prevent source hallucination

  // Populated during Phase B
  fixResults: Annotation<Array<{ fixId: string; targetFile: string; ok: boolean; error?: string }>>,

  status: Annotation<string>,
  error: Annotation<string | null>,
});

export type LintDiagnoseState = typeof LintDiagnoseStateAnnotation.State;
export type LintFixState = typeof LintFixStateAnnotation.State;
