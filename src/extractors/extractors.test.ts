import { describe, it, expect, vi } from "vitest";
import { detectSourceType } from "./index";
import { getYoutubeId } from "./youtube";

// Mock problematic modules
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {},
  version: "1.0.0"
}));

// Mock Tauri modules
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
}));

describe("Source Detection", () => {
  it("detects YouTube URLs correctly", () => {
    expect(detectSourceType("https://www.youtube.com/watch?v=abc12345678")).toBe("youtube");
    expect(detectSourceType("https://youtu.be/abc12345678")).toBe("youtube");
    expect(detectSourceType("https://www.youtube.com/shorts/abc12345678")).toBe("youtube");
  });

  it("detects PDF files correctly", () => {
    expect(detectSourceType("C:/docs/paper.pdf")).toBe("pdf");
    expect(detectSourceType("/home/user/manual.PDF")).toBe("pdf");
  });

  it("detects web URLs correctly", () => {
    expect(detectSourceType("https://example.com/article")).toBe("url");
    expect(detectSourceType("http://test.org")).toBe("url");
  });

  it("returns unknown for invalid inputs", () => {
    expect(detectSourceType("just some text")).toBe("unknown");
    expect(detectSourceType("C:/docs/image.png")).toBe("unknown");
  });
});

describe("YouTube ID Parsing", () => {
  it("extracts ID from various formats", () => {
    const id = "abc12345678";
    expect(getYoutubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(getYoutubeId(`https://youtu.be/${id}`)).toBe(id);
    expect(getYoutubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(getYoutubeId(`https://www.youtube.com/v/${id}`)).toBe(id);
  });
});
