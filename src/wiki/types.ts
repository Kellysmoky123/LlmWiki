// src/wiki/types.ts

export type Category = "source" | "entity" | "concept" | "analysis";

export interface IndexEntry {
  relativePath: string;
  title: string;
  summary: string;
  category: Category;
  createdAt: string; // ISO date
  updatedAt: string;
  sourceCount: number;
}

export type OperationType = "ingest" | "query" | "lint" | "manual";

export interface LogEntry {
  timestamp: string; // ISO date
  operation: OperationType;
  title: string;
  pagesAffected: string[];
  summary: string;
}
