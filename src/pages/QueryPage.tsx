import { useState } from "react";
import { Search, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const { ask, isQuerying, progress, error, answer } = useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    ask(query.trim());
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-white">Ask your Wiki</h2>
        <p className="text-white/40">Query across all your ingested knowledge using LLM agents.</p>
      </header>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute inset-y-0 left-5 flex items-center text-white/20">
          <Search size={24} />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="How do attention mechanisms work?" 
          className="w-full rounded-2xl border border-white/5 bg-black/50 py-6 pl-16 pr-20 text-xl text-white outline-none focus:border-aqua-cyan/50 focus:ring-1 focus:ring-aqua-cyan/50 shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!query.trim() || isQuerying}
          className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-xl bg-aqua-cyan text-black transition-all hover:brightness-110 disabled:opacity-50"
        >
          {isQuerying ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
        </button>
      </form>
      
      <div className="flex flex-col items-center justify-center py-10">
        {isQuerying ? (
          <div className="flex flex-col items-center gap-4 text-aqua-cyan/60">
             <Loader2 size={40} className="animate-spin" />
             <p className="text-sm font-medium animate-pulse">{progress}</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-red-500 glass-card">
            <AlertCircle size={24} />
            <p className="text-sm">{error}</p>
          </div>
        ) : answer ? (
          <div className="w-full glass-card p-10 prose prose-invert prose-aqua max-w-none text-left animate-in slide-in-from-bottom-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {answer}
            </ReactMarkdown>
          </div>
        ) : (
           <p className="text-white/20">Ask a question to see your agent's synthesis.</p>
        )}
      </div>
    </div>
  );
}
