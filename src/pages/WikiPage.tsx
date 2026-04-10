// src/pages/WikiPage.tsx
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, Database, Search as SearchIcon, FileText, FolderOpen, Tag } from "lucide-react";
import { useSettingsStore } from "../store/settings.store";
import { readIndex, readPage, listPages } from "../wiki/reader";

interface FileEntry {
  path: string;
  name: string;
  category: string;
  tags: string[];
}

export default function WikiPage() {
  const { wikiPath } = useSettingsStore();
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<string>("");
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [nameToPathMap, setNameToPathMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadLibrary() {
      if (!wikiPath) return;

      // 1. Parse index for tags mapping
      let pathTagsMap: Record<string, string[]> = {};
      let extractedTags: string[] = [];

      const indexResult = await readIndex(wikiPath);
      if (indexResult.ok) {
        const indexText = indexResult.data;
        // Parse global tags
        const tagsMatch = indexText.match(/## Existing Tags\n([^\n]+)/);
        if (tagsMatch && !tagsMatch[1].includes("_none yet_")) {
          extractedTags = tagsMatch[1]
            .split(",")
            .map(t => t.trim().replace(/^#/, ""))
            .filter(Boolean);
        }

        // Parse per-page tags
        const lines = indexText.split("\n");
        for (const line of lines) {
          const match = line.match(/- \[\[(.*?)\]\].*?tags: (.*?)(?: \||$)/);
          if (match) {
            const rawPath = match[1];
            const p = rawPath.endsWith(".md") ? rawPath : rawPath + ".md";
            const tags = match[2]
              .split(",")
              .map(t => t.trim().replace(/^#/, ""))
              .filter(Boolean);
            pathTagsMap[p] = tags;
            
            // Collect any newly seen tags
            tags.forEach(t => {
                if (!extractedTags.includes(t)) extractedTags.push(t);
            });
          }
        }
      }

      setAllTags([...new Set(extractedTags)].sort());

      // 2. Scan direct files to build the UI list
      const subdirs = ["wiki", "sources", "analyses", "entities", "concepts"];
      const entries: FileEntry[] = [];

      const nameMap: Record<string, string> = {};
      for (const subdir of subdirs) {
        const result = await listPages(wikiPath, subdir);
        if (result.ok) {
          for (const path of result.data) {
            const filename = path.split(/[\\/]/).pop() || path;
            const name = filename.replace(/\.md$/i, "");
            entries.push({
              path,
              name,
              category: subdir,
              tags: pathTagsMap[path] || []
            });
            // Map the simple name (e.g. "Transformer")
            nameMap[name.toLowerCase()] = path;
            // Map the path (e.g. "concepts/Transformer.md")
            nameMap[path.toLowerCase()] = path;
            // Map the path without extension (e.g. "concepts/Transformer")
            nameMap[path.replace(/\.md$/i, "").toLowerCase()] = path;
          }
        }
      }

      setFileEntries(entries);
      setNameToPathMap(nameMap);
    }

    loadLibrary();
  }, [wikiPath]);

  const viewPage = async (relativePath: string) => {
    if (!wikiPath) return;
    console.log("Attempting to load page:", relativePath);
    const result = await readPage(wikiPath, relativePath);
    if (result.ok) {
      setPageContent(result.data);
      setCurrentPage(relativePath);
    } else {
      console.error("Failed to load page:", result.error);
      setPageContent(`# Error\n\nFailed to load \`${relativePath}\`\n\n**Details:** ${result.error}`);
      setCurrentPage(relativePath);
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = fileEntries;

    if (selectedTag) {
      result = result.filter(e => e.tags.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    
    return result;
  }, [fileEntries, searchQuery, selectedTag]);

  // Group entries by category
  const grouped = useMemo(() => {
    const map: Record<string, FileEntry[]> = {};
    for (const entry of filteredEntries) {
      if (!map[entry.category]) map[entry.category] = [];
      map[entry.category].push(entry);
    }
    return map;
  }, [filteredEntries]);

  const categoryIcons: Record<string, string> = {
    wiki: "📄",
    sources: "📚",
    analyses: "🔍",
    entities: "👤",
    concepts: "💡",
  };

  if (currentPage) {
    return (
      <div className="h-full overflow-y-auto p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setCurrentPage(null)}
          className="flex items-center gap-2 text-sm font-medium text-white/40 transition-colors hover:text-aqua-cyan"
        >
          <ChevronLeft size={16} /> Back to Library
        </button>

        <div className="mx-auto max-w-5xl">
          <article className="glass-card min-h-[60vh] p-10 prose prose-invert prose-aqua max-w-none shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => {
                const href = props.href || "";
                
                // Handle internal wiki links
                // We check if it matches a path in our library
                const cleanHref = decodeURIComponent(href).replace(/\.md$/, "");
                const resolvedPath = nameToPathMap[cleanHref.toLowerCase()];

                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (resolvedPath) {
                    viewPage(resolvedPath);
                  } else if (href.startsWith("http")) {
                    // In a real Tauri app, we'd use shell.open(href)
                    // For now, at least prevent the app from navigating/crashing
                    console.log("External link clicked:", href);
                    // window.open(href, '_blank'); // This might still trigger navigation in some Tauri setups
                  }
                };

                return (
                  <a 
                    href={href}
                    onClick={handleClick}
                    className="text-aqua-cyan hover:underline cursor-pointer"
                  >
                    {props.children}
                  </a>
                );
              }
            }}
          >
            {pageContent.replace(/\[\[(.*?)\]\]/g, (_, match) => {
               // Handle aliases like [[PageName|Display Text]]
               const [path, label] = match.split("|");
               return `[${label || path}](${path})`;
            })}
          </ReactMarkdown>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Knowledge Library</h2>
          <p className="text-white/40">Your interlinked network of truth.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-aqua-cyan/10 text-aqua-cyan shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <Database size={24} />
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-white/5 bg-white/[0.02] px-8 py-4">
          <SearchIcon size={16} className="text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pages..."
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-white/20"
          />
        </div>

        {/* Global Tags Section */}
        {allTags.length > 0 && (
          <div className="border-b border-white/5 bg-black/40 px-8 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-aqua-cyan/70" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Filter by Tag</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                 onClick={() => setSelectedTag(null)}
                 className={`rounded-full border px-3 py-1 text-[10px] font-bold transition-colors ${
                   selectedTag === null
                     ? "border-aqua-cyan bg-aqua-cyan/10 text-aqua-cyan"
                     : "border-white/10 text-white/40 hover:border-white/30"
                 }`}
              >
                ALL
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold transition-colors ${
                    selectedTag === tag
                      ? "border-aqua-cyan bg-aqua-cyan/10 text-aqua-cyan"
                      : "border-white/10 text-white/40 hover:border-aqua-cyan/30 hover:text-aqua-cyan"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-8">
          {!wikiPath ? (
            <div className="text-center py-12 opacity-50">
              <p className="text-sm text-white/40">Set your wiki folder path in Settings to get started.</p>
            </div>
          ) : fileEntries.length === 0 ? (
            <div className="text-center py-12 opacity-50">
              <FolderOpen className="mx-auto mb-4 text-white/20" size={40} />
              <p className="text-sm text-white/40">No wiki pages found yet. Try ingesting some sources.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([category, entries]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <span>{categoryIcons[category] ?? "📁"}</span>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">
                      {category} <span className="text-white/20">({entries.length})</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map((entry) => (
                      <button
                        key={entry.path}
                        onClick={() => viewPage(entry.path)}
                        className="group flex flex-col justify-center rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-aqua-cyan/30 hover:bg-aqua-cyan/5 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)]"
                      >
                        <div className="flex items-center gap-3">
                           <FileText size={14} className="shrink-0 text-aqua-cyan/60" />
                           <span className="truncate text-sm font-medium text-white group-hover:text-aqua-cyan">{entry.name}</span>
                        </div>
                        {entry.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 opacity-60">
                            {entry.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] font-medium text-white/50">#{tag}</span>
                            ))}
                            {entry.tags.length > 3 && <span className="text-[9px] text-white/30">+{entry.tags.length - 3}</span>}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              {Object.keys(grouped).length === 0 && (
                <div className="text-center py-12 opacity-50">
                  <p className="text-sm text-white/40">No pages match your current filters.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
