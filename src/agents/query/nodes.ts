// src/agents/query/nodes.ts
import { QueryState } from "./state";
import { runPrompt } from "../../llm/runner";
import { QUERY_ANSWER_PROMPT } from "../../llm/prompts";
import { buildChatModel } from "../../llm/factory";
import { useSettingsStore } from "../../store/settings.store";
import { searchPages, readPage, listPages } from "../../wiki/reader";
import { writePage, generateSlug } from "../../wiki/writer";
import { addToIndex } from "../../wiki/index-manager";
import { appendLog } from "../../wiki/log-manager";

export async function searchNode(state: QueryState): Promise<Partial<QueryState>> {
  const searchResult = await searchPages(state.wikiPath, state.question);
  let relevantPages = searchResult.ok ? searchResult.data.slice(0, 10) : [];

  // Fallback: if keyword search found nothing, load all wiki/ pages so the LLM
  // always has something to work with (better than an empty context)
  if (relevantPages.length === 0) {
    console.log("[searchNode] No keyword matches — loading all wiki pages as fallback");
    const allWiki = await listPages(state.wikiPath, "wiki");
    if (allWiki.ok) relevantPages = allWiki.data.slice(0, 12);
    const allSources = await listPages(state.wikiPath, "sources");
    if (allSources.ok) relevantPages = [...relevantPages, ...allSources.data.slice(0, 3)];
  }

  return {
    relevantPages,
    status: `Found ${relevantPages.length} relevant pages`,
  };
}

export async function readContextNode(state: QueryState): Promise<Partial<QueryState>> {
  let context = "";
  let totalChars = 0;
  const MAX_TOTAL_CONTEXT = 150000; 

  for (const path of state.relevantPages) {
    const pageResult = await readPage(state.wikiPath, path);
    if (pageResult.ok) {
      const pageText = pageResult.data;
      if (totalChars + pageText.length > MAX_TOTAL_CONTEXT) {
        const remaining = MAX_TOTAL_CONTEXT - totalChars;
        if (remaining > 100) {
           context += `\n--- PAGE: ${path} (Truncated) ---\n${pageText.slice(0, remaining)}\n`;
        }
        break; 
      }
      context += `\n--- PAGE: ${path} ---\n${pageText}\n`;
      totalChars += pageText.length;
    }
  }

  return {
    context: context.trim() || "No relevant context found in wiki.",
    status: "Context aggregated",
  };
}

export async function synthesizeNode(state: QueryState): Promise<Partial<QueryState>> {
  const settings = useSettingsStore.getState();
  const modelResult = buildChatModel(settings);
  if (!modelResult.ok) throw new Error(modelResult.error);

  const result = await runPrompt(modelResult.data, QUERY_ANSWER_PROMPT, {
    question: state.question,
    context: state.context
  });

  if (!result.ok) throw new Error(result.error);
  return { answer: result.data, status: "Answer synthesized" };
}

export async function saveAnswerNode(state: QueryState): Promise<Partial<QueryState>> {
  const settings = useSettingsStore.getState();
  if (!settings.autoSaveQueries) {
      return { status: "DONE" };
  }

  const title = `Analysis: ${state.question.slice(0, 50)}...`;
  const slug = generateSlug(state.question.slice(0, 30));
  const relativePath = `analyses/${slug}.md`;

  const writeResult = await writePage(state.wikiPath, relativePath, state.answer);
  if (!writeResult.ok) throw new Error(writeResult.error);

  await addToIndex(state.wikiPath, {
    relativePath,
    title,
    summary: state.answer.slice(0, 150) + "...",
    category: "analysis",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceCount: state.relevantPages.length
  });

  await appendLog(state.wikiPath, {
     timestamp: new Date().toISOString(),
     operation: "query",
     title,
     pagesAffected: [relativePath],
     summary: `Answered question: ${state.question}`
  });

  return { 
    savedPath: relativePath, 
    status: "DONE" 
  };
}
