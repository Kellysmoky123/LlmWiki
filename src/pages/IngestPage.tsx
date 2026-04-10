// src/pages/IngestPage.tsx
import { useState } from "react";
import { Upload, Link as LinkIcon, Video, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useIngest } from "../hooks/useIngest";
import { open } from "@tauri-apps/plugin-dialog";

export default function IngestPage() {
  const [url, setUrl] = useState("");
  const { ingest, isIngesting, progress, error, reset } = useIngest();

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      ingest(url.trim());
      setUrl("");
    }
  };

  const handleFileSelect = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (selected && typeof selected === "string") {
      ingest(selected);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">Ingest New Knowledge</h2>
        <p className="text-white/40">Drop PDFs, URLs, or YouTube links to expand your wiki.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* URL Input Section */}
        <section className="glass-card p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aqua-cyan/10 text-aqua-cyan">
              <LinkIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white">Web & Social</h3>
              <p className="text-xs text-white/40">Articles or YouTube links</p>
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isIngesting}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition-all focus:border-aqua-cyan/50 focus:outline-none focus:ring-1 focus:ring-aqua-cyan/50"
              />
            </div>
            <button
              type="submit"
              disabled={isIngesting || !url.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-all hover:bg-aqua-cyan disabled:opacity-50"
            >
              Analyze Link
            </button>
          </form>

          <div className="mt-8 flex gap-4 text-white/20">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Video size={14} /> YouTube
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <FileText size={14} /> Web Articles
            </div>
          </div>
        </section>

        {/* File Drop Section */}
        <section 
          onClick={handleFileSelect}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-12 transition-all hover:border-aqua-cyan/40 hover:bg-aqua-cyan/[0.02]"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-white/40 transition-all group-hover:scale-110 group-hover:bg-aqua-cyan/10 group-hover:text-aqua-cyan">
            <Upload size={32} />
          </div>
          <h3 className="text-lg font-bold text-white">Local Library</h3>
          <p className="text-sm text-white/40">Click to select a PDF document</p>
        </section>
      </div>

      {/* Status Overlay/Footer - Moved to bottom center as a sleek bar */}
      {(isIngesting || progress || error) && (
        <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50">
          <div className={`rounded-full border px-6 py-3 shadow-2xl backdrop-blur-xl flex items-center gap-4 transition-all animate-in slide-in-from-bottom-5 ${
            error ? "border-red-500/20 bg-red-900/40 text-red-100" : "border-aqua-cyan/20 bg-black/80 text-aqua-cyan"
          }`}>
            {isIngesting ? (
              <Loader2 className="animate-spin shrink-0" size={18} />
            ) : error ? (
              <AlertCircle className="text-red-500 shrink-0" size={18} />
            ) : (
              <CheckCircle2 className="text-green-500 shrink-0" size={18} />
            )}
            
            <div className="flex-1 truncate">
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50 mr-2">
                {isIngesting ? "INGESTING" : error ? "ERROR" : "COMPLETED"}
              </span>
              <span className={`text-xs font-medium ${error ? "text-red-200" : "text-white"}`}>
                {error || progress}
              </span>
            </div>

            {!isIngesting && (
                <button 
                  onClick={reset}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
