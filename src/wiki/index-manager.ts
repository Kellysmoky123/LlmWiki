// src/wiki/index-manager.ts
import { readIndex } from "./reader";
import { writePage } from "./writer";
import { IndexEntry } from "./types";
import { Result, ErrorCode } from "../types/result";

export async function addToIndex(wikiPath: string, entry: IndexEntry): Promise<Result<void>> {
  try {
    const indexResult = await readIndex(wikiPath);
    if (!indexResult.ok) return { ok: false, error: indexResult.error, code: indexResult.code };

    let content = indexResult.data;
    const categoryHeader = `## ${entry.category.charAt(0).toUpperCase() + entry.category.slice(1)}s`;
    
    // Check if entry already exists to avoid duplicates
    const link = `[[${entry.relativePath.replace(".md", "")}]]`;
    if (content.includes(link)) {
      // Update existing entry line
      const lines = content.split("\n");
      const index = lines.findIndex(l => l.includes(link));
      if (index !== -1) {
        lines[index] = `- ${link} — ${entry.title} — ${entry.createdAt.split("T")[0]} — ${entry.summary}`;
        content = lines.join("\n");
      }
    } else {
      // Add new entry under category header
      const entryLine = `- ${link} — ${entry.title} — ${entry.createdAt.split("T")[0]} — ${entry.summary}`;
      const headerPos = content.indexOf(categoryHeader);
      
      if (headerPos !== -1) {
        const insertPos = content.indexOf("\n", headerPos) + 1;
        content = content.slice(0, insertPos) + entryLine + "\n" + content.slice(insertPos);
      } else {
        // Append category if missing
        content += `\n${categoryHeader}\n${entryLine}\n`;
      }
    }

    // Update "Last updated" date
    content = content.replace(/Last updated: .*/, `Last updated: ${new Date().toISOString()}`);

    return await writePage(wikiPath, "index.md", content);
  } catch (error) {
    return { ok: false, error: `Failed to update index: ${error}`, code: ErrorCode.WIKI_WRITE_ERROR };
  }
}

export async function removeFromIndex(wikiPath: string, relativePath: string): Promise<Result<void>> {
  try {
    const indexResult = await readIndex(wikiPath);
    if (!indexResult.ok) return { ok: false, error: indexResult.error, code: indexResult.code };

    let content = indexResult.data;
    const link = `[[${relativePath.replace(".md", "")}]]`;
    
    const lines = content.split("\n").filter(line => !line.includes(link));
    const newContent = lines.join("\n");

    return await writePage(wikiPath, "index.md", newContent);
  } catch (error) {
    return { ok: false, error: `Failed to remove from index: ${error}`, code: ErrorCode.WIKI_WRITE_ERROR };
  }
}

export async function rebuildIndex(wikiPath: string): Promise<Result<void>> {
  // Scans all subdirectories and builds from scratch.
  // In a real app, this would parse titles from files. 
  // For now, we'll implement a basic version that initializes a clean index.
  const initialIndex = `# Wiki Index\n\nLast updated: ${new Date().toISOString()}\n\n## Sources\n\n## Entities\n\n## Concepts\n\n## Analyses\n`;
  return await writePage(wikiPath, "index.md", initialIndex);
}
