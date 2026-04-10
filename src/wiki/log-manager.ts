// src/wiki/log-manager.ts
import { readLog } from "./reader";
import { writePage } from "./writer";
import { LogEntry } from "./types";
import { Result, ErrorCode } from "../types/result";

export async function appendLog(wikiPath: string, entry: LogEntry): Promise<Result<void>> {
  try {
    const logResult = await readLog(wikiPath);
    let content = logResult.ok ? logResult.data : "# Wiki Log\n\nChronological list of all operations.\n";

    const dateStr = entry.timestamp.split("T")[0];
    const logLine = `\n## [${dateStr}] ${entry.operation} | ${entry.title}\n` +
                    `Pages affected: ${entry.pagesAffected.join(", ") || "none"}\n` +
                    `Summary: ${entry.summary}\n`;

    content += logLine;
    return await writePage(wikiPath, "log.md", content);
  } catch (error) {
    return { ok: false, error: `Failed to append log: ${error}`, code: ErrorCode.WIKI_WRITE_ERROR };
  }
}

export async function parseLog(wikiPath: string): Promise<Result<LogEntry[]>> {
  try {
    const logResult = await readLog(wikiPath);
    if (!logResult.ok) return { ok: false, error: logResult.error, code: logResult.code };

    const content = logResult.data;
    const entries: LogEntry[] = [];
    const sections = content.split("\n## [").slice(1);

    for (const section of sections) {
      const lines = section.split("\n");
      const headerLine = lines[0]; // YYYY-MM-DD] operation | title
      const date = headerLine.split("]")[0];
      const rest = headerLine.split("]")[1].trim();
      const operation = rest.split("|")[0].trim() as any;
      const title = rest.split("|")[1].trim();
      
      const pagesLine = lines.find(l => l.startsWith("Pages affected:")) || "";
      const pagesAffected = pagesLine.replace("Pages affected:", "").split(",").map(p => p.trim()).filter(p => p);
      
      const summaryLine = lines.find(l => l.startsWith("Summary:")) || "";
      const summary = summaryLine.replace("Summary:", "").trim();

      entries.push({
        timestamp: `${date}T00:00:00.000Z`,
        operation,
        title,
        pagesAffected,
        summary
      });
    }

    return { ok: true, data: entries.reverse() }; // Newest first
  } catch (error) {
    return { ok: false, error: `Failed to parse log: ${error}`, code: ErrorCode.UNKNOWN_ERROR };
  }
}

export async function getRecentEntries(wikiPath: string, n: number): Promise<Result<LogEntry[]>> {
  const result = await parseLog(wikiPath);
  if (!result.ok) return result;
  return { ok: true, data: result.data.slice(0, n) };
}
