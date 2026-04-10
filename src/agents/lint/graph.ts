// src/agents/lint/graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { LintDiagnoseStateAnnotation, LintFixStateAnnotation } from "./state";
import {
  readAllPagesNode,
  diagnosePagesNode,
  renderReportNode,
  applyFixesNode,
  appendFixLogNode,
} from "./nodes";

// ── Phase A: Diagnosis graph ──────────────────────────────────────────────────
const diagnoseWorkflow = new StateGraph(LintDiagnoseStateAnnotation)
  .addNode("read_all_pages", readAllPagesNode)
  .addNode("diagnose_pages", diagnosePagesNode)
  .addNode("render_report", renderReportNode)

  .addEdge(START, "read_all_pages")
  .addEdge("read_all_pages", "diagnose_pages")
  .addEdge("diagnose_pages", "render_report")
  .addEdge("render_report", END);

export const lintDiagnoseAgent = diagnoseWorkflow.compile();

// ── Phase B: Auto-Fix graph ───────────────────────────────────────────────────
const fixWorkflow = new StateGraph(LintFixStateAnnotation)
  .addNode("apply_fixes", applyFixesNode)
  .addNode("append_fix_log", appendFixLogNode)

  .addEdge(START, "apply_fixes")
  .addEdge("apply_fixes", "append_fix_log")
  .addEdge("append_fix_log", END);

export const lintFixAgent = fixWorkflow.compile();
