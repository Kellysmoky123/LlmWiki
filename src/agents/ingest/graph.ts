// src/agents/ingest/graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { IngestStateAnnotation } from "./state";
import {
  saveSourceNode,
  planPagesNode,
  writePagesNode,
  updateIndexNode,
  appendLogNode,
} from "./nodes";

const workflow = new StateGraph(IngestStateAnnotation)
  .addNode("save_source", saveSourceNode)
  .addNode("plan_pages", planPagesNode)
  .addNode("write_pages", writePagesNode)
  .addNode("update_index", updateIndexNode)
  .addNode("append_log", appendLogNode)

  .addEdge(START, "save_source")
  .addEdge("save_source", "plan_pages")
  .addEdge("plan_pages", "write_pages")
  .addEdge("write_pages", "update_index")
  .addEdge("update_index", "append_log")
  .addEdge("append_log", END);

export const ingestAgent = workflow.compile();
