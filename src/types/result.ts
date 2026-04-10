// src/types/result.ts

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode };

export enum ErrorCode {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  LLM_API_ERROR = "LLM_API_ERROR",
  INVALID_URL = "INVALID_URL",
  PDF_PARSE_ERROR = "PDF_PARSE_ERROR",
  YOUTUBE_NO_TRANSCRIPT = "YOUTUBE_NO_TRANSCRIPT",
  WIKI_WRITE_ERROR = "WIKI_WRITE_ERROR",
  SETTINGS_MISSING = "SETTINGS_MISSING",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}
