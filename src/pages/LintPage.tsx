// src/pages/LintPage.tsx
import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Link2Off,
  Ghost,
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Wrench,
} from "lucide-react";
import { useLint } from "../hooks/useLint";
import { SuggestedFix } from "../agents/lint/state";

// ── Icon map per fix type ─────────────────────────────────────────────────────
const typeIcon: Record<SuggestedFix["type"], React.ReactNode> = {
  orphan: <Ghost className="w-4 h-4" />,
  broken_link: <Link2Off className="w-4 h-4" />,
  contradiction: <Zap className="w-4 h-4" />,
  gap: <HelpCircle className="w-4 h-4" />,
  formatting: <Wrench className="w-4 h-4" />,
};

const typeBadge: Record<SuggestedFix["type"], string> = {
  orphan: "bg-white/10 text-white/60",
  broken_link: "bg-rose-900/50 text-rose-300",
  contradiction: "bg-amber-900/50 text-amber-300",
  gap: "bg-aqua-cyan/10 text-aqua-cyan",
  formatting: "bg-purple-900/50 text-purple-300",
};

const typeLabel: Record<SuggestedFix["type"], string> = {
  orphan: "Orphan",
  broken_link: "Broken Link",
  contradiction: "Contradiction",
  gap: "Gap",
  formatting: "Formatting",
};

// ── Individual fix card ───────────────────────────────────────────────────────
function FixCard({
  fix,
  checked,
  onToggle,
  onAddToInstructions,
}: {
  fix: SuggestedFix;
  checked: boolean;
  onToggle: () => void;
  onAddToInstructions: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        checked
          ? "border-aqua-cyan/40 bg-aqua-cyan/5"
          : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            checked
              ? "bg-aqua-cyan border-aqua-cyan"
              : "border-white/30 hover:border-aqua-cyan/60"
          }`}
        >
          {checked && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[fix.type]}`}
            >
              {typeIcon[fix.type]}
              {typeLabel[fix.type]}
            </span>
            {fix.targetFiles.map((f) => (
              <span
                key={f}
                className="text-xs text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded"
              >
                {f.replace("wiki/", "")}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm text-white/80 leading-relaxed">{fix.description}</p>

          {/* Expandable proposed change */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 text-xs text-aqua-cyan/70 hover:text-aqua-cyan flex items-center gap-1 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide" : "Show"} proposed fix
          </button>

          {expanded && (
            <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/10 text-xs text-white/60 leading-relaxed">
              {fix.proposedChange}
            </div>
          )}
        </div>

        {/* Add to instructions button */}
        <button
          title="Add fix description to custom instructions"
          onClick={() => onAddToInstructions(`[${typeLabel[fix.type]}] ${fix.description}\n`)}
          className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-aqua-cyan hover:bg-aqua-cyan/10 transition-all"
        >
          <ClipboardPaste className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LintPage() {
  const { status, suggestedFixes, reportMarkdown, fixResults, error, runDiagnosis, applyFixes } =
    useLint();

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [userInstructions, setUserInstructions] = useState("");
  const [showReport, setShowReport] = useState(false);

  const toggleFix = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (checkedIds.size === suggestedFixes.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(suggestedFixes.map((f) => f.id)));
    }
  }, [checkedIds, suggestedFixes]);

  const addToInstructions = useCallback((text: string) => {
    setUserInstructions((prev) => (prev ? prev + "\n" + text : text));
  }, []);

  const handleAddSelection = useCallback(() => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      addToInstructions(`Note: "${selection}"`);
    }
  }, [addToInstructions]);

  const handleApplyFixes = useCallback(() => {
    const approved = suggestedFixes.filter((f) => checkedIds.has(f.id));
    applyFixes(approved, userInstructions);
  }, [suggestedFixes, checkedIds, userInstructions, applyFixes]);

  const isDiagnosing = status === "diagnosing";
  const isFixing = status === "fixing";
  const hasFixes = suggestedFixes.length > 0;
  const hasChecked = checkedIds.size > 0;

  const groups: Array<{ type: SuggestedFix["type"]; label: string }> = [
    { type: "broken_link", label: "Broken Links" },
    { type: "contradiction", label: "Contradictions" },
    { type: "orphan", label: "Orphan Pages" },
    { type: "gap", label: "Knowledge Gaps" },
    { type: "formatting", label: "Formatting Issues" },
  ];

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header (Stay fixed at top) */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aqua-cyan/10 text-aqua-cyan">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Wiki Diagnostics</h1>
            <p className="text-xs text-white/40">
              Full health scan · Orphan pages · Broken links · Contradictions · Gaps
            </p>
          </div>
        </div>
        <button
          onClick={() => runDiagnosis()}
          disabled={isDiagnosing || isFixing}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-aqua-cyan disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDiagnosing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          {isDiagnosing ? "Scanning Wiki…" : "Run Diagnostics"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-8 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Idle state */}
      {status === "idle" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ShieldCheck className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/60 text-lg font-medium">Ready to scan</p>
            <p className="text-white/20 text-sm mt-1">
              Click "Run Diagnostics" to perform a full health check of your wiki.
            </p>
          </div>
        </div>
      )}

      {/* Scanning state */}
      {isDiagnosing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-aqua-cyan mx-auto mb-4 animate-spin" />
            <p className="text-white font-medium">Scanning all wiki pages…</p>
            <p className="text-white/40 text-sm mt-1">
              Reading pages, running LLM diagnosis. This may take a minute.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {(status === "done" || status === "fixing" || status === "fixed") && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Summary bar */}
          <div className="flex items-center gap-4 px-8 py-3 bg-white/[0.02] border-b border-white/5 flex-shrink-0">
            <span className="text-sm text-white/60">
              <span className="font-semibold text-white">{suggestedFixes.length}</span>{" "}
              {suggestedFixes.length === 1 ? "issue" : "issues"} found
            </span>
            <div className="flex items-center gap-2 text-xs">
              {groups.map(({ type, label }) => {
                const count = suggestedFixes.filter((f) => f.type === type).length;
                if (!count) return null;
                return (
                  <span key={type} className={`flex items-center gap-1 ${typeBadge[type]} px-2 py-0.5 rounded-full`}>
                    {typeIcon[type]} {count} {label}
                  </span>
                );
              })}
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowReport((v) => !v)}
                className="text-xs text-white/40 hover:text-aqua-cyan transition-colors"
              >
                {showReport ? "Hide" : "Show"} full report
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-5xl flex flex-col gap-6">
              {/* Full markdown report (collapsible) */}
              {showReport && reportMarkdown && (
                <div className="glass-card p-6">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMarkdown}</ReactMarkdown>
                  </div>
                </div>
              )}

              {hasFixes ? (
                <>
                  {/* Fix Review Panel */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
                        Review &amp; Approve Fixes
                      </h2>
                      <button
                        onClick={toggleAll}
                        className="text-xs text-aqua-cyan/70 hover:text-aqua-cyan transition-colors"
                      >
                        {checkedIds.size === suggestedFixes.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {groups.map(({ type, label }) => {
                        const typeFixes = suggestedFixes.filter((f) => f.type === type);
                        if (!typeFixes.length) return null;
                        return (
                          <div key={type}>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">
                              {label}
                            </p>
                            <div className="flex flex-col gap-2">
                              {typeFixes.map((fix) => (
                                <FixCard
                                  key={fix.id}
                                  fix={fix}
                                  checked={checkedIds.has(fix.id)}
                                  onToggle={() => toggleFix(fix.id)}
                                  onAddToInstructions={addToInstructions}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Auto-Fix Panel */}
                  <div className="glass-card p-6 flex flex-col gap-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-aqua-cyan" />
                      Auto-Fix Instructions
                    </h2>

                    <div className="relative">
                      <textarea
                        value={userInstructions}
                        onChange={(e) => setUserInstructions(e.target.value)}
                        placeholder={"Optional: Add custom instructions for the AI before it applies fixes…\n\ne.g. 'Keep the tone formal', 'Prefer adding links over removing them'"}
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-white/20 focus:border-aqua-cyan/50 focus:outline-none focus:ring-1 focus:ring-aqua-cyan/50 resize-none transition-all"
                      />
                      <button
                        onClick={handleAddSelection}
                        title="Add your current text selection to instructions"
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-aqua-cyan/10 text-xs text-white/40 hover:text-aqua-cyan transition-all border border-white/10"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        Add selection
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/20">
                        {checkedIds.size === 0
                          ? "Select fixes above to enable execution"
                          : `${checkedIds.size} fix${checkedIds.size > 1 ? "es" : ""} selected`}
                      </p>
                      <button
                        onClick={handleApplyFixes}
                        disabled={!hasChecked || isFixing}
                        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-bold text-black transition-all hover:bg-aqua-cyan disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isFixing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wrench className="w-4 h-4" />
                        )}
                        {isFixing ? "Applying Fixes…" : "Execute Selected Fixes"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-aqua-cyan mx-auto mb-3" />
                  <p className="text-white font-medium">Wiki is healthy!</p>
                  <p className="text-white/40 text-sm mt-1">No issues detected.</p>
                </div>
              )}

              {/* Fix Results */}
              {status === "fixed" && fixResults.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-aqua-cyan" />
                    Fix Results
                  </h3>
                  <div className="flex flex-col gap-2">
                    {fixResults.map((r) => (
                      <div key={r.fixId} className="flex items-center gap-2 text-sm">
                        {r.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span className="font-mono text-xs text-white/40">{r.targetFile}</span>
                        {!r.ok && <span className="text-red-400 text-xs">— {r.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
