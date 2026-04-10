// src/agents/query/graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { QueryStateAnnotation } from "./state";
import { 
  searchNode, 
  readContextNode, 
  synthesizeNode, 
  saveAnswerNode 
} from "./nodes";

const workflow = new StateGraph(QueryStateAnnotation)
  .addNode("search", searchNode)
  .addNode("read_context", readContextNode)
  .addNode("synthesize", synthesizeNode)
  .addNode("save_answer", saveAnswerNode)
  
  .addEdge(START, "search")
  .addEdge("search", "read_context")
  .addEdge("read_context", "synthesize")
  .addEdge("synthesize", "save_answer")
  .addEdge("save_answer", END);

export const queryAgent = workflow.compile();
