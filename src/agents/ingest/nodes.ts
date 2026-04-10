// src/agents/ingest/nodes.ts
import { IngestState, WikiPagePlan } from "./state";
import { runPrompt } from "../../llm/runner";
import {
  INGEST_PLAN_PROMPT,
  INGEST_WRITE_PAGE_PROMPT,
  INGEST_UPDATE_PAGE_PROMPT,
} from "../../llm/prompts";
import { writePage, generateSlug } from "../../wiki/writer";
import { readPage, readIndex } from "../../wiki/reader";
import { appendLog } from "../../wiki/log-manager";

// ─── STEP 1: Save raw source text ───────────────────────────────────────────

export async function saveSourceNode(state: IngestState): Promise<Partial<IngestState>> {
  // Title Case with spaces from title
  const basename = generateSlug(state.sourceTitle);
  const sourceFile = `sources/${basename}.md`;

  // Build full source markdown
  const date = new Date().toISOString().split("T")[0];
  const header = `# ${state.sourceTitle}\n\n`;
  const footer = `\n\n---\n**Type:** ${state.sourceType}\n**Date Saved:** ${date}\n`;
  const content = header + state.sourceText + footer;

  const writeResult = await writePage(state.wikiPath, sourceFile, content);
  if (!writeResult.ok) throw new Error(`Failed to save source: ${writeResult.error}`);

  console.log(`[saveSource] Saved to ${sourceFile}`);
  return {
    sourceFile,
    sourceFileBasename: basename,
    status: `Source saved to ${sourceFile}`,
  };
}

// ─── STEP 2: Plan wiki pages ─────────────────────────────────────────────────

export async function planPagesNode(state: IngestState): Promise<Partial<IngestState>> {
  // Read existing index for context (pages + tags)
  const indexResult = await readIndex(state.wikiPath);
  const wikiIndex = indexResult.ok
    ? indexResult.data
    : "No existing wiki pages yet.";

  const truncated = state.sourceText.slice(0, 200000);
  console.log(`[planPages] Planning wiki pages for "${state.sourceTitle}"...`);

  const result = await runPrompt(null, INGEST_PLAN_PROMPT, {
    wikiIndex,
    sourceText: truncated,
  });

  if (!result.ok) throw new Error(`Planning failed: ${result.error}`);

  let plan: WikiPagePlan[] = [];
  let raw = result.data.trim();
  
  try {
    // 1. Clean markdown artifacts
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // 2. Extract first valid JSON block if surrounded by text
    const firstObj = raw.indexOf('{');
    const firstArr = raw.indexOf('[');
    const start = (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) ? firstObj : firstArr;
    
    const lastObj = raw.lastIndexOf('}');
    const lastArr = raw.lastIndexOf(']');
    const end = (lastObj > lastArr) ? lastObj : lastArr;

    if (start !== -1 && end !== -1) {
      raw = raw.slice(start, end + 1);
    }

    const parsed = JSON.parse(raw);
    // Support both { "pages": [...] } and [...] formats
    plan = Array.isArray(parsed) ? parsed : (parsed.pages || []);
  } catch (e) {
    throw new Error(`Knowledge Plan parsing failed: ${e}. Please try again.`);
  }

  return { plan, status: `Knowledge extracted: ${plan.length} units planned.` };
}

// ─── STEP 3: Write each planned page ─────────────────────────────────────────

export async function writePagesNode(state: IngestState): Promise<Partial<IngestState>> {
  const date = new Date().toISOString().split("T")[0];
  const truncated = state.sourceText.slice(0, 200000);
  const writtenPages: string[] = [];

  if (!state.plan || state.plan.length === 0) {
    return { writtenPages: [], status: "Source analyzed. No new wiki units required." };
  }

  // Collect all tags currently in the index
  const indexResult = await readIndex(state.wikiPath);
  const existingTags = extractTagsFromIndex(indexResult.ok ? indexResult.data : "");

  let counter = 0;
  for (const pageplan of state.plan) {
    counter++;
    const safeFilename = generateSlug(pageplan.filename || pageplan.title || `Topic ${counter}`);
    const filePath = `wiki/${safeFilename}.md`;
    
    // UI Progress Update
    const progressMsg = `Drafting knowledge unit ${counter}/${state.plan.length}: ${safeFilename}`;
    console.log(`[writePages] ${progressMsg}`);

    const relatedTopicsLinks = (pageplan.relatedTopics || [])
      .map(t => `- [[${t}]]`)
      .join("\n");

    const relatedTopicsText = (pageplan.relatedTopics || []).join(", ");

    let content: string;

    if (pageplan.action === "update" && pageplan.existingFile) {
      const existingPagePath = `wiki/${pageplan.existingFile}.md`;
      const existingResult = await readPage(state.wikiPath, existingPagePath);
      const existingContent = existingResult.ok ? existingResult.data : "";

      const result = await runPrompt(null, INGEST_UPDATE_PAGE_PROMPT, {
        existingContent,
        sourceText: truncated,
        sourceFile: `[[sources/${state.sourceFileBasename}]]`,
        date,
      });

      if (!result.ok) continue; 
      content = result.data;
    } else {
      const result = await runPrompt(null, INGEST_WRITE_PAGE_PROMPT, {
        title: pageplan.title || safeFilename,
        sourceText: truncated,
        relatedTopics: relatedTopicsText || "None",
        relatedTopicsLinks: relatedTopicsLinks || "_No related topics yet_",
        sourceFile: `[[sources/${state.sourceFileBasename}]]`,
        sourceFileBasename: state.sourceFileBasename,
        existingTags: existingTags.join(", ") || "none yet",
        date,
      });

      if (!result.ok) continue;
      content = result.data;
    }

    const writeResult = await writePage(state.wikiPath, filePath, content);
    if (writeResult.ok) {
      writtenPages.push(filePath);
    }
  }

  return { writtenPages, status: `Successfully documented ${writtenPages.length} knowledge units.` };
}

// ─── STEP 4: Update index.md ──────────────────────────────────────────────────

export async function updateIndexNode(state: IngestState): Promise<Partial<IngestState>> {
  const date = new Date().toISOString().split("T")[0];

  // Build a map of all pages: read existing index entries + add new ones
  const indexResult = await readIndex(state.wikiPath);
  const existingLines: string[] = indexResult.ok
    ? indexResult.data.split("\n").filter(l => l.startsWith("- [[wiki/"))
    : [];

  // Track by filename to deduplicate
  const pageMap = new Map<string, string>();
  for (const line of existingLines) {
    const match = line.match(/\[\[wiki\/([^\]]+)\]\]/);
    if (match) pageMap.set(match[1], line);
  }

  // Add/update newly written pages
  for (const pageplan of state.plan) {
    if (state.writtenPages.includes(`wiki/${pageplan.filename}.md`)) {
      const tags = pageplan.tags.map(t => `#${t}`).join(", ");
      pageMap.set(
        pageplan.filename,
        `- [[wiki/${pageplan.filename}]] | tags: ${tags} | updated: ${date}`
      );
    }
  }

  // Collect all unique tags
  const allTags = new Set<string>();
  for (const plan of state.plan) plan.tags.forEach(t => allTags.add(t));
  // Also extract from existing index
  extractTagsFromIndex(indexResult.ok ? indexResult.data : "").forEach(t => allTags.add(t));

  const tagsLine = Array.from(allTags).map(t => `#${t}`).join(", ");
  const pagesSection = Array.from(pageMap.values()).join("\n");

  const newIndex = `# Wiki Index\n\nLast updated: ${date}\n\n## Existing Tags\n${tagsLine || "_none yet_"}\n\n## Pages\n${pagesSection || "_No pages yet_"}\n`;

  await writePage(state.wikiPath, "index.md", newIndex);
  console.log("[updateIndex] index.md updated.");
  return { status: "Index updated" };
}

// ─── STEP 5: Append log ───────────────────────────────────────────────────────

export async function appendLogNode(state: IngestState): Promise<Partial<IngestState>> {
  await appendLog(state.wikiPath, {
    timestamp: new Date().toISOString(),
    operation: "ingest",
    title: state.sourceTitle,
    pagesAffected: [state.sourceFile, ...state.writtenPages],
    summary: `Ingested from ${state.sourceType}. Created/updated ${state.writtenPages.length} wiki pages.`,
  });
  return { status: "DONE" };
}

function extractTagsFromIndex(indexContent: string): string[] {
  const match = indexContent.match(/## Existing Tags\n([^\n#]+)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map(t => t.replace(/#/g, "").trim())
    .filter(Boolean);
}
