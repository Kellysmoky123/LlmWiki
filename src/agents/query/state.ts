// src/agents/query/state.ts
import { Annotation } from "@langchain/langgraph";

export const QueryStateAnnotation = Annotation.Root({
  // Input
  question: Annotation<string>,
  wikiPath: Annotation<string>,
  
  // Intermediate
  relevantPages: Annotation<string[]>, // paths to pages read
  context: Annotation<string>,       // aggregated content from pages
  
  // Output
  answer: Annotation<string>,
  savedPath: Annotation<string | null>,
  
  // Progress/Status
  status: Annotation<string>,
  error: Annotation<string | null>,
});

export type QueryState = typeof QueryStateAnnotation.State;
