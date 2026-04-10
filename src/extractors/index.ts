// src/extractors/index.ts
import { extractPdf } from "./pdf";
import { extractUrl } from "./web";
import { extractYoutube, getYoutubeId } from "./youtube";
import { Result, ErrorCode } from "../types/result";

export type SourceType = "pdf" | "youtube" | "url" | "unknown";

export function detectSourceType(input: string): SourceType {
  const trimmed = input.trim();
  
  if (trimmed.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }
  
  if (getYoutubeId(trimmed)) {
    return "youtube";
  }
  
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return "url";
  }
  
  return "unknown";
}

export async function extractSource(input: string): Promise<Result<{ text: string; type: SourceType; title: string }>> {
  const type = detectSourceType(input);
  
  let result: Result<string>;
  
  switch (type) {
    case "pdf":
      result = await extractPdf(input);
      break;
    case "youtube":
      result = await extractYoutube(input);
      break;
    case "url":
      result = await extractUrl(input);
      break;
    default:
      return { ok: false, error: "Unsupported source type", code: ErrorCode.INVALID_URL };
  }
  
  if (!result.ok) {
    return result;
  }
  
  // Extract title from the first line of markdown (# Title)
  const titleMatch = result.data.match(/^# (.*)/);
  const title = titleMatch ? titleMatch[1] : "Untitled Source";
  
  return {
    ok: true,
    data: {
      text: result.data,
      type,
      title
    }
  };
}
