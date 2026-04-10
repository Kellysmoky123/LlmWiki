# 🧠 LLM Wiki

**LLM Wiki** is a local-first, personal knowledge base that grows with you. Instead of just storing documents, it uses agentic AI to incrementally build and maintain a structured wiki of interlinked Markdown files.

Inspired by the "LLM Wiki" pattern proposed by Andrej Karpathy, this app transforms your raw PDFs, URLs, and YouTube transcripts into a high-density knowledge graph that you fully own.

![App Icon](src-tauri/icons/icon.png)

## ✨ Key Features

- **Agentic Ingestion**: Intelligent agents (powered by LangGraph.js) read your sources and decide how to split, link, and update your wiki pages.
- **BYOK (Bring Your Own Key)**: Full support for OpenAI, Anthropic, Google Gemini, and custom OpenAI-compatible APIs (like Ollama). No middleman, no subscription.
- **Local-First Knowledge**: All wiki pages are standard interlinked Markdown files. You can open your wiki folder in Obsidian, Logseq, or any text editor.
- **Responsive & Mobile Ready**: A premium, state-of-the-art UI build with React and Tailwind CSS v4, optimized for both 4K desktops and Android mobile devices.
- **Deep Querying**: Ask questions across your entire knowledge base. The Query agent reads full wiki pages without truncation to synthesize comprehensive answers with citations.
- **Built-in Diagnostics**: A "Lint" agent that constantly scans your wiki for broken links, orphan pages, or contradictions, suggesting automated fixes.

## 🚀 Technical Stack

| Layer | Technology |
|---|---|
| **Runtime** | Tauri v2 (Rust + Desktop/Mobile) |
| **Frontend** | React 19 + Vite 6 + Tailwind CSS 4 |
| **Orchestration** | LangGraph.js (Agent State Machines) |
| **Models** | Multi-provider support via LangChain.js |
| **Persistence** | Local Markdown Filesystem |
| **State** | Zustand (Global UI & Settings) |

## 📦 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (LTS)
- [uv](https://github.com/astral-sh/uv) (for Python tools if used)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Kellysmoky123/LlmWiki.git
   cd LlmWiki
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

### Building for Production
- **Windows**: `npm run tauri build` (Generates EXE/MSI)
- **Android**: Use the provided GitHub Action or `npm run tauri android build`

## 🛡️ Privacy
All processing happens on your device. Your API keys are stored securely using the Tauri Store plugin (encrypted at rest on most platforms) and are only sent directly to the LLM provider you choose.

## 📄 License
MIT
