// src/wiki/reader.ts
import { readTextFile, readDir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { Result, ErrorCode } from "../types/result";

export async function readPage(wikiPath: string, relativePath: string): Promise<Result<string>> {
  try {
    const fullPath = await join(wikiPath, relativePath);
    if (!(await exists(fullPath))) {
      return { ok: false, error: `Page not found: ${relativePath}`, code: ErrorCode.FILE_NOT_FOUND };
    }
    const content = await readTextFile(fullPath);
    return { ok: true, data: content };
  } catch (error) {
    return { ok: false, error: `Failed to read page: ${error}`, code: ErrorCode.FILE_NOT_FOUND };
  }
}

export async function readIndex(wikiPath: string): Promise<Result<string>> {
  return readPage(wikiPath, "index.md");
}

export async function readLog(wikiPath: string): Promise<Result<string>> {
  return readPage(wikiPath, "log.md");
}

export async function listPages(wikiPath: string, subdir: string): Promise<Result<string[]>> {
  try {
    const fullPath = await join(wikiPath, subdir);
    if (!(await exists(fullPath))) {
      return { ok: true, data: [] };
    }
    const entries = await readDir(fullPath);
    const files = entries
      .filter((e) => e.isFile && e.name.endsWith(".md"))
      .map((e) => `${subdir}/${e.name}`);
    return { ok: true, data: files };
  } catch (error) {
    return { ok: false, error: `Failed to list pages: ${error}`, code: ErrorCode.FILE_NOT_FOUND };
  }
}

export async function pageExists(wikiPath: string, relativePath: string): Promise<boolean> {
  try {
    const fullPath = await join(wikiPath, relativePath);
    return await exists(fullPath);
  } catch {
    return false;
  }
}

export async function searchPages(wikiPath: string, query: string): Promise<Result<string[]>> {
  try {
    const subdirs = ["sources", "wiki", "entities", "concepts", "analyses"];
    const lowerQuery = query.toLowerCase();
    
    // Stopwords to ignore to prevent false positives when searching
    const stopwords = new Set(["what", "is", "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "how", "why", "who", "when", "where", "do", "does", "did", "are", "was", "were", "be", "been", "can", "could", "would", "should", "explain", "describe", "tell", "about", "of", "it", "that", "this", "these", "those", "i", "me", "my", "you", "your"]);

    // Extract meaningful terms from query
    const terms = lowerQuery.replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 1 && !stopwords.has(t));
    if (terms.length === 0) terms.push(lowerQuery.replace(/[^\w\s]/g, '').replace(/\s+/g, '')); // fallback if somehow empty

    const scores: Array<{ path: string; score: number }> = [];

    for (const subdir of subdirs) {
      const pagesResult = await listPages(wikiPath, subdir);
      if (pagesResult.ok) {
        for (const relativePath of pagesResult.data) {
          const contentResult = await readPage(wikiPath, relativePath);
          if (contentResult.ok) {
            const content = contentResult.data.toLowerCase();
            const pathLower = relativePath.toLowerCase();
            let score = 0;

            for (const term of terms) {
              // Massive weight if the search term is literally in the filename
              if (pathLower.includes(term)) {
                score += 10;
              }
              
              // Count occurrences in the document text
              const occurrences = content.split(term).length - 1;
              score += occurrences;
            }

            if (score > 0) {
              scores.push({ path: relativePath, score });
            }
          }
        }
      }
    }

    // Sort descending by score, then map to string list
    scores.sort((a, b) => b.score - a.score);
    const sortedPaths = scores.map(s => s.path);

    return { ok: true, data: sortedPaths };
  } catch (error) {
    return { ok: false, error: `Search failed: ${error}`, code: ErrorCode.FILE_NOT_FOUND };
  }
}
