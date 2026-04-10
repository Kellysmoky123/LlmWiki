// src/wiki/writer.ts
import { mkdir, writeFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { Result, ErrorCode } from "../types/result";

/**
 * Initializes the wiki folder structure if it doesn't exist.
 * @param wikiPath Absolute path to the wiki root folder.
 */
export async function ensureWikiStructure(wikiPath: string): Promise<Result<void>> {
  try {
    if (!wikiPath) {
      return { ok: false, error: "Wiki path not set", code: ErrorCode.SETTINGS_MISSING };
    }

    // Only two subdirs: sources/ and wiki/
    for (const subdir of ["sources", "wiki"]) {
      const fullPath = await join(wikiPath, subdir);
      if (!(await exists(fullPath))) {
        await mkdir(fullPath, { recursive: true });
      }
    }

    // Create index.md if missing
    const indexPath = await join(wikiPath, "index.md");
    if (!(await exists(indexPath))) {
      const initialIndex = `# Wiki Index\n\nLast updated: ${new Date().toISOString().split("T")[0]}\n\n## Existing Tags\n_none yet_\n\n## Pages\n_No pages yet_\n`;
      await writeFile(indexPath, new TextEncoder().encode(initialIndex));
    }

    // Create log.md if missing
    const logPath = await join(wikiPath, "log.md");
    if (!(await exists(logPath))) {
      const initialLog = `# Wiki Log\n\nChronological history of operations.\n`;
      await writeFile(logPath, new TextEncoder().encode(initialLog));
    }

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Failed to ensure wiki structure:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error creating wiki structure",
      code: ErrorCode.WIKI_WRITE_ERROR,
    };
  }
}

export async function writePage(wikiPath: string, relativePath: string, content: string): Promise<Result<void>> {
  try {
    const fullPath = await join(wikiPath, relativePath);

    // Compute parent directory using Tauri path API — handles both / and \ on Windows
    const parts = relativePath.split(/[\\/]/);
    if (parts.length > 1) {
      parts.pop(); // remove filename
      const parentRelative = parts.join("/");
      const parentDir = await join(wikiPath, parentRelative);
      if (!(await exists(parentDir))) {
        await mkdir(parentDir, { recursive: true });
      }
    }

    await writeFile(fullPath, new TextEncoder().encode(content));
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: `Failed to write page: ${error}`, code: ErrorCode.WIKI_WRITE_ERROR };
  }
}

export async function updatePage(wikiPath: string, relativePath: string, updater: (existing: string) => string): Promise<Result<void>> {
  try {
    const fullPath = await join(wikiPath, relativePath);
    let existingContent = "";
    
    if (await exists(fullPath)) {
      existingContent = await readTextFile(fullPath);
    }

    const newContent = updater(existingContent);
    return await writePage(wikiPath, relativePath, newContent);
  } catch (error) {
    return { ok: false, error: `Failed to update page: ${error}`, code: ErrorCode.WIKI_WRITE_ERROR };
  }
}

export async function deletePage(wikiPath: string, relativePath: string): Promise<Result<void>> {
  try {
    const fullPath = await join(wikiPath, relativePath);
    if (!(await exists(fullPath))) {
      return { ok: false, error: "File not found", code: ErrorCode.FILE_NOT_FOUND };
    }
    await remove(fullPath);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: `Failed to delete page: ${error}`, code: ErrorCode.WIKI_WRITE_ERROR };
  }
}

export function generateSlug(title: string): string {
  // Use Title Case with spaces. Clean only truly invalid filename characters.
  const clean = title
    .replace(/[<>:"/\\|?*]/g, "") // remove characters forbidden in filenames
    .trim();
  
  return clean || `Untitled ${Date.now()}`;
}

// Internal helper for updating pages
async function readTextFile(path: string): Promise<string> {
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  return await readTextFile(path);
}

async function remove(path: string): Promise<void> {
  const { remove } = await import("@tauri-apps/plugin-fs");
  await remove(path);
}
