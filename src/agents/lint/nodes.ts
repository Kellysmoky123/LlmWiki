// src/agents/lint/nodes.ts
import { LintDiagnoseState, LintFixState, SuggestedFix } from "./state";
import { runPrompt } from "../../llm/runner";
import { LINT_DIAGNOSE_PROMPT, LINT_APPLY_FIX_PROMPT } from "../../llm/prompts";
import { readPage, readIndex, listPages } from "../../wiki/reader";
import { writePage } from "../../wiki/writer";
import { appendLog } from "../../wiki/log-manager";

// ── PHASE A NODES ─────────────────────────────────────────────────────────────

/**
 * Node 1: Load every wiki page + the index into state.
 * Builds `allPagesContent` (a single text dump for the LLM) and `allPagePaths`.
 */
export async function readAllPagesNode(
  state: LintDiagnoseState
): Promise<Partial<LintDiagnoseState>> {
  const subdirs = ["wiki", "sources", "analyses", "entities", "concepts"];
  const allPagePaths: string[] = [];
  const sections: string[] = [];

  for (const subdir of subdirs) {
    const pagesResult = await listPages(state.wikiPath, subdir);
    if (!pagesResult.ok) continue;

    for (const relativePath of pagesResult.data) {
      const contentResult = await readPage(state.wikiPath, relativePath);
      if (contentResult.ok) {
        allPagePaths.push(relativePath);
        // Clearly delimit each file for the LLM to parse
        sections.push(`\n\n===FILE: ${relativePath}===\n${contentResult.data}`);
      }
    }
  }

  const indexResult = await readIndex(state.wikiPath);
  const wikiIndex = indexResult.ok ? indexResult.data : "No index found.";

  const allPagesContent = sections.join("\n");
  console.log(`[lint/readAllPages] Loaded ${allPagePaths.length} pages.`);

  return {
    allPagesContent,
    allPagePaths,
    wikiIndex,
    status: `Loaded ${allPagePaths.length} pages`,
  };
}

/**
 * Node 2: Run the LLM diagnosis prompt across all pages.
 * Parses the returned JSON into a typed SuggestedFix[].
 */
export async function diagnosePagesNode(
  state: LintDiagnoseState
): Promise<Partial<LintDiagnoseState>> {
  // Truncate if very large wiki — keep under token limits (approx 30k tokens)
  const truncated = state.allPagesContent.slice(0, 120000);

  const result = await runPrompt(null, LINT_DIAGNOSE_PROMPT, {
    wikiIndex: state.wikiIndex,
    allPagePaths: state.allPagePaths.join("\n"),
    allPagesContent: truncated,
  });

  if (!result.ok) {
    console.error("[lint/diagnose] LLM error:", result.error);
    return { suggestedFixes: [], status: "Diagnosis failed", error: result.error };
  }

  let suggestedFixes: SuggestedFix[] = [];
  try {
    const raw = result.data
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    suggestedFixes = JSON.parse(raw);
  } catch (e) {
    console.error("[lint/diagnose] Failed to parse fix JSON:", result.data);
    return { suggestedFixes: [], status: "JSON parse error", error: String(e) };
  }

  console.log(`[lint/diagnose] Found ${suggestedFixes.length} issues.`);
  return { suggestedFixes, status: `Diagnosis complete – ${suggestedFixes.length} issues found` };
}

/**
 * Node 3: Render a human-readable markdown report from the suggestedFixes.
 * Writes it to analyses/lint-report-{date}.md.
 */
export async function renderReportNode(
  state: LintDiagnoseState
): Promise<Partial<LintDiagnoseState>> {
  const date = new Date().toISOString().split("T")[0];
  const fixes = state.suggestedFixes;

  const byType = (type: string) =>
    fixes.filter((f) => f.type === type);

  const section = (title: string, emoji: string, fixes: SuggestedFix[]) => {
    if (fixes.length === 0) return `\n## ${emoji} ${title}\n_None found._`;
    return (
      `\n## ${emoji} ${title}\n` +
      fixes
        .map(
          (f, i) =>
            `### ${i + 1}. ${f.description}\n` +
            `**Files:** ${f.targetFiles.join(", ") || "_none_"}\n\n` +
            `**Proposed Fix:** ${f.proposedChange}\n`
        )
        .join("\n")
    );
  };

  const reportMarkdown =
    `# Wiki Lint Report — ${date}\n\n` +
    `_Scanned ${state.allPagePaths.length} pages. Found ${fixes.length} issues._\n` +
    section("Orphan Pages", "👻", byType("orphan")) +
    section("Broken Links", "🔗", byType("broken_link")) +
    section("Contradictions", "⚡", byType("contradiction")) +
    section("Knowledge Gaps", "🕳️", byType("gap")) +
    section("Formatting Issues", "🎨", byType("formatting"));

  const reportPath = `analyses/lint-report-${date}.md`;
  await writePage(state.wikiPath, reportPath, reportMarkdown);

  await appendLog(state.wikiPath, {
    timestamp: new Date().toISOString(),
    operation: "lint",
    title: `Lint Report — ${date}`,
    pagesAffected: [reportPath],
    summary: `Scanned ${state.allPagePaths.length} pages. Found ${fixes.length} issues.`,
  });

  console.log(`[lint/renderReport] Report written to ${reportPath}`);
  return { reportMarkdown, status: "DONE" };
}

// ── PHASE B NODES ─────────────────────────────────────────────────────────────

/**
 * Node 1 (Phase B): Apply each approved fix sequentially.
 * For each fix, reads the target file, calls LLM with LINT_APPLY_FIX_PROMPT,
 * and writes the corrected content back.
 */
export async function applyFixesNode(
  state: LintFixState
): Promise<Partial<LintFixState>> {
  const fixResults: LintFixState["fixResults"] = [];

  for (const fix of state.approvedFixes) {
    // Fixes can touch multiple files (e.g. contradictions affecting two pages).
    // Process first targetFile, or use empty string for new-file creations.
    const targetFile =
      fix.targetFiles.length > 0 ? fix.targetFiles[0] : `wiki/${fix.id}.md`;

    const existingResult = await readPage(state.wikiPath, targetFile);
    const existingContent = existingResult.ok ? existingResult.data : "";

    const result = await runPrompt(null, LINT_APPLY_FIX_PROMPT, {
      existingContent,
      wikiIndex: state.wikiIndex, // Added index context to prevent hallucination
      fixType: fix.type,
      fixDescription: fix.description,
      proposedChange: fix.proposedChange,
      userInstructions: state.userInstructions || "No additional instructions.",
    });

    if (!result.ok) {
      console.error(`[lint/applyFix] LLM failed for ${targetFile}:`, result.error);
      fixResults.push({ fixId: fix.id, targetFile, ok: false, error: result.error });
      continue;
    }

    const writeResult = await writePage(state.wikiPath, targetFile, result.data);
    if (writeResult.ok) {
      console.log(`[lint/applyFix] Fixed: ${targetFile}`);
      fixResults.push({ fixId: fix.id, targetFile, ok: true });
    } else {
      fixResults.push({ fixId: fix.id, targetFile, ok: false, error: writeResult.error });
    }
  }

  return { fixResults, status: `Applied ${fixResults.filter((r) => r.ok).length}/${state.approvedFixes.length} fixes` };
}

/**
 * Node 2 (Phase B): Append a log entry for the auto-fix run.
 */
export async function appendFixLogNode(
  state: LintFixState
): Promise<Partial<LintFixState>> {
  const affected = state.fixResults.filter((r) => r.ok).map((r) => r.targetFile);
  await appendLog(state.wikiPath, {
    timestamp: new Date().toISOString(),
    operation: "lint",
    title: "Auto-Fix Applied",
    pagesAffected: affected,
    summary: `Applied ${affected.length} approved fixes. ${state.fixResults.filter((r) => !r.ok).length} failed.`,
  });
  return { status: "DONE" };
}
