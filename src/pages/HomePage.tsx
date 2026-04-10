// src/pages/HomePage.tsx
import { useState, useEffect } from "react";
import { ArrowUpRight, Zap, FileText, Book, Clock } from "lucide-react";
import { useSettingsStore } from "../store/settings.store";
import { listPages } from "../wiki/reader";
import { getRecentEntries } from "../wiki/log-manager";
import { LogEntry } from "../wiki/types";

export default function HomePage() {
  const { wikiPath, userName } = useSettingsStore();
  const [counts, setCounts] = useState({ sources: 0, wiki: 0, analyses: 0 });
  const [recent, setRecent] = useState<LogEntry[]>([]);

  useEffect(() => {
    async function loadStats() {
      if (!wikiPath) return;
      
      try {
        const [s, w, a, log] = await Promise.all([
          listPages(wikiPath, "sources"),
          listPages(wikiPath, "wiki"),
          listPages(wikiPath, "analyses"),
          getRecentEntries(wikiPath, 3)
        ]);

        setCounts({
          sources: s.ok ? s.data.length : 0,
          wiki: w.ok ? w.data.length : 0,
          analyses: a.ok ? a.data.length : 0,
        });

        if (log.ok) setRecent(log.data);
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    }
    loadStats();
  }, [wikiPath]);

  const stats = [
    { label: "Sources", value: counts.sources, icon: Zap },
    { label: "Wiki Pages", value: counts.wiki, icon: FileText },
    { label: "Analyses", value: counts.analyses, icon: Book },
  ];

  return (
    <div className="space-y-12 pb-12 animate-fade-in">
      <header className="space-y-4">
        <h2 className="text-4xl font-bold tracking-tight text-white">
          Welcome, <span className="text-aqua-cyan">{userName || "Architect"}</span>
        </h2>
        <p className="max-w-xl text-lg text-white/50">
          Compounding your knowledge through interlinked, LLM-generated wisdom.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="group glass-card aqua-glow p-6 transition-all hover:-translate-y-1">
            <div className="mb-4 flex items-center justify-between">
              <stat.icon className="text-aqua-cyan" size={24} />
              <ArrowUpRight className="text-white/20 transition-colors group-hover:text-aqua-cyan" size={20} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Activity */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Clock className="text-aqua-cyan" size={18} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Recent Construction</h3>
          </div>
          
          <div className="space-y-4">
            {recent.length > 0 ? (
              recent.map((entry, idx) => (
                <div key={idx} className="glass-card flex items-start gap-4 p-5 transition-colors hover:bg-white/5">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    entry.operation === "ingest" ? "bg-aqua-cyan" : "bg-purple-500"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{entry.title}</p>
                    <p className="mt-1 text-xs text-white/40">{entry.summary}</p>
                    <div className="mt-3 text-[10px] text-white/20">{new Date(entry.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card p-10 text-center opacity-50">
                <p className="text-sm text-white/40">No recent activity found.</p>
              </div>
            )}
          </div>
        </section>

        {/* Global Overview Card */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Book className="text-aqua-cyan" size={18} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Methodology</h3>
          </div>
          <div className="glass-card relative overflow-hidden p-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-aqua-cyan/5 blur-3xl" />
            <h3 className="mb-4 text-xl font-bold text-white">Recursive Synthesis</h3>
            <p className="text-sm leading-relaxed text-white/40">
              Your wiki isn't a static folder. Every time you ingest a new source, the agents cross-reference existing entities and concepts, 
              updating your knowledge base to reflect new connections.
            </p>
            <div className="mt-8 flex gap-3">
              <span className="rounded-full bg-aqua-cyan/10 px-3 py-1 text-[10px] font-bold text-aqua-cyan">LLM-POWERED</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-white/40">LOCAL STORAGE</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
