// src/extractors/pdf.ts
import * as pdfjs from "pdfjs-dist";
import { readFile } from "@tauri-apps/plugin-fs";
import { Result, ErrorCode } from "../types/result";

// The universally supported Vite bundler pattern for pdfjs WebWorkers in strict CSP sandboxes
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractPdf(filePath: string): Promise<Result<string>> {
  try {
    const data = await readFile(filePath);
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n";
    }

    // Strip excessive whitespace
    const cleanText = fullText
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();

    if (!cleanText) {
      return { ok: false, error: "No text content found in PDF", code: ErrorCode.PDF_PARSE_ERROR };
    }

    return { ok: true, data: cleanText };
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    if (error instanceof Error && error.message.includes("File not found")) {
      return { ok: false, error: "PDF file not found", code: ErrorCode.FILE_NOT_FOUND };
    }
    return { ok: false, error: `Failed to parse PDF: ${error}`, code: ErrorCode.PDF_PARSE_ERROR };
  }
}
