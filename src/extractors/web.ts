// src/extractors/web.ts
import { fetch } from "@tauri-apps/plugin-http";
import { Readability } from "@mozilla/readability";
import { Result, ErrorCode } from "../types/result";

export async function extractUrl(url: string): Promise<Result<string>> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      return { ok: false, error: `Failed to fetch URL: ${response.status} ${response.statusText}`, code: ErrorCode.INVALID_URL };
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // Check if it looks like a valid HTML document
    if (!doc || !doc.body) {
      return { ok: false, error: "Failed to parse HTML document", code: ErrorCode.INVALID_URL };
    }

    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return { ok: false, error: "Could not extract article content from page", code: ErrorCode.INVALID_URL };
    }

    const markdown = `# ${article.title}\n\n${article.textContent.trim()}`;
    return { ok: true, data: markdown };
  } catch (error) {
    console.error("Web Extraction Error:", error);
    return { ok: false, error: `Failed to extract web content: ${error}`, code: ErrorCode.INVALID_URL };
  }
}
