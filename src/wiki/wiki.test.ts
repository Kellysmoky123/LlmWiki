import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureWikiStructure, generateSlug } from "./writer";
import { mkdir, writeFile, exists } from "@tauri-apps/plugin-fs";
import { addToIndex } from "./index-manager";
import { appendLog } from "./log-manager";
import * as reader from "./reader";

// Mock Tauri modules
vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn().mockImplementation((...args) => Promise.resolve(args.join("/"))),
}));

// Mock internal reader module
vi.mock("./reader", () => ({
  readPage: vi.fn(),
  readIndex: vi.fn(),
  readLog: vi.fn(),
  listPages: vi.fn(),
  pageExists: vi.fn(),
  searchPages: vi.fn(),
}));

describe("Wiki Writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensureWikiStructure returns SETTINGS_MISSING if path is empty", async () => {
    const result = await ensureWikiStructure("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SETTINGS_MISSING");
    }
  });

  it("ensureWikiStructure creates all required subdirectories", async () => {
    (exists as any).mockResolvedValue(false);
    const result = await ensureWikiStructure("/mock/wiki");
    
    expect(result.ok).toBe(true);
    expect(mkdir).toHaveBeenCalledWith("/mock/wiki/sources", { recursive: true });
  });

  it("generateSlug converts titles correctly", () => {
    expect(generateSlug("My Article Title")).toBe("my-article-title");
    expect(generateSlug("Hello World! (2024)")).toBe("hello-world-2024");
  });
});

describe("Wiki Index & Log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds to index correctly", async () => {
    (reader.readIndex as any).mockResolvedValue({ 
      ok: true, 
      data: "# Wiki Index\n\nLast updated: ...\n\n## Sources\n" 
    });
    (exists as any).mockResolvedValue(true);

    const entry = {
      relativePath: "sources/test.md",
      title: "Test Source",
      summary: "Test summary",
      category: "source" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceCount: 1
    };

    const result = await addToIndex("/mock", entry);
    expect(result.ok).toBe(true);
    expect(writeFile).toHaveBeenCalled();
  });

  it("appends log correctly", async () => {
    (reader.readLog as any).mockResolvedValue({ ok: true, data: "# Log\n" });
    (exists as any).mockResolvedValue(true);

    const entry = {
      timestamp: new Date().toISOString(),
      operation: "ingest" as const,
      title: "Test Operation",
      pagesAffected: ["test.md"],
      summary: "did something"
    };

    const result = await appendLog("/mock", entry);
    expect(result.ok).toBe(true);
    expect(writeFile).toHaveBeenCalled();
  });
});
