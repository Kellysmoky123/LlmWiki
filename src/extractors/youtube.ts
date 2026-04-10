// src/extractors/youtube.ts
import { fetch } from "@tauri-apps/plugin-http";
import { Result, ErrorCode } from "../types/result";

export function getYoutubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function extractYoutube(url: string): Promise<Result<string>> {
  try {
    const videoId = getYoutubeId(url);
    if (!videoId) {
      return { ok: false, error: "Invalid YouTube URL", code: ErrorCode.INVALID_URL };
    }

    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      return { ok: false, error: "Failed to fetch YouTube page", code: ErrorCode.INVALID_URL };
    }

    const html = await response.text();
    
    // Extract video title
    const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
    const title = titleMatch ? titleMatch[1] : "YouTube Video";

    // Extract ytInitialPlayerResponse where captions actually live
    const dataMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
    if (!dataMatch) {
      return { ok: false, error: "Could not find video data (ytInitialPlayerResponse)", code: ErrorCode.YOUTUBE_NO_TRANSCRIPT };
    }

    const data = JSON.parse(dataMatch[1]);
    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return { ok: false, error: "No captions available for this video", code: ErrorCode.YOUTUBE_NO_TRANSCRIPT };
    }

    // Prefer English, then auto-generated English, then first available
    const track = captionTracks.find((t: any) => t.languageCode === "en" && !t.kind) || 
                  captionTracks.find((t: any) => t.languageCode === "en") || 
                  captionTracks[0];

    const captionResponse = await fetch(track.baseUrl);
    if (!captionResponse.ok) {
      return { ok: false, error: "Failed to fetch transcript", code: ErrorCode.YOUTUBE_NO_TRANSCRIPT };
    }

    const xml = await captionResponse.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");
    
    let transcript = "";
    for (let i = 0; i < textNodes.length; i++) {
        const text = textNodes[i].textContent || "";
        // Decode HTML entities using DOMParser
        const doc = new DOMParser().parseFromString(text, "text/html");
        transcript += (doc.documentElement.textContent || "") + " ";
    }

    const cleanTranscript = transcript.replace(/\s+/g, " ").trim();
    const markdown = `# ${title}\n\nSource: ${url}\n\n${cleanTranscript}`;

    return { ok: true, data: markdown };
  } catch (error) {
    console.error("YouTube Extraction Error:", error);
    return { ok: false, error: `Failed to extract YouTube transcript: ${error}`, code: ErrorCode.YOUTUBE_NO_TRANSCRIPT };
  }
}
