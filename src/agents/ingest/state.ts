// src/agents/ingest/state.ts
import { Annotation } from "@langchain/langgraph";
import { SourceType } from "../../extractors";

export interface WikiPagePlan {
  action: "create" | "update";
  filename: string;           // CamelCase, no extension
  title: string;
  tags: string[];
  relatedTopics: string[];    // CamelCase filenames of related pages
  summary: string;
  existingFile?: string;      // only when action === "update"
}

export const IngestStateAnnotation = Annotation.Root({
  // Input
  sourceText: Annotation<string>,
  sourceType: Annotation<SourceType>,
  sourceTitle: Annotation<string>,
  wikiPath: Annotation<string>,

  // After step 1
  sourceFile: Annotation<string>,         // relative path: sources/OpenClawProjects.md
  sourceFileBasename: Annotation<string>, // OpenClawProjects

  // After step 2
  plan: Annotation<WikiPagePlan[]>,

  // After step 3
  writtenPages: Annotation<string[]>,

  // Status
  status: Annotation<string>,
  error: Annotation<string | null>,
});

export type IngestState = typeof IngestStateAnnotation.State;
