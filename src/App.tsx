// src/App.tsx
import { useState, useEffect } from "react";
import { useSettingsStore } from "./store/settings.store";
import { Settings, Search, Database, PlusCircle, LayoutDashboard, ShieldCheck } from "lucide-react";
import SettingsPage from "./pages/SettingsPage";
import HomePage from "./pages/HomePage";
import IngestPage from "./pages/IngestPage";
import QueryPage from "./pages/QueryPage";
import WikiPage from "./pages/WikiPage";
import LintPage from "./pages/LintPage";

type Tab = "home" | "ingest" | "query" | "wiki" | "lint" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const { loadSettings, isLoaded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#000000] text-aqua-cyan">
        <div className="animate-pulse text-2xl font-bold tracking-widest">LOADING LLM WIKI...</div>
      </div>
    );
  }

  const renderTab = () => {
    try {
      switch (activeTab) {
        case "home": return <HomePage />;
        case "ingest": return <IngestPage />;
        case "query": return <QueryPage />;
        case "wiki": return <WikiPage />;
        case "lint": return <LintPage />;
        case "settings": return <SettingsPage />;
        default: return <HomePage />;
      }
    } catch (err) {
      console.error("Tab selection error:", err);
      return (
        <div className="p-8 text-red-500 glass-card">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-sm opacity-60">Please try switching to another tab.</p>
        </div>
      );
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "ingest", label: "Ingest", icon: PlusCircle },
    { id: "query", label: "Query", icon: Search },
    { id: "wiki", label: "Wiki", icon: Database },
    { id: "lint", label: "Check", icon: ShieldCheck },
    { id: "settings", label: "Config", icon: Settings },
  ] as const;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-white selection:bg-aqua-cyan/30 flex-col lg:flex-row">
      
      {/* Mobile Header (Branding only) */}
      <div className="lg:hidden flex items-center justify-center px-6 py-4 border-b border-white/5 bg-amoled-gray/50 backdrop-blur-md sticky top-0 z-50">
        <h1 className="bg-gradient-to-r from-aqua-cyan to-aqua-dark bg-clip-text text-xl font-black text-transparent">
          LLM WIKI
        </h1>
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-amoled-gray py-8 flex-shrink-0">
        <div className="mb-10 px-6">
          <h1 className="bg-gradient-to-r from-aqua-cyan to-aqua-dark bg-clip-text text-2xl font-black text-transparent">
            LLM WIKI
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-white/40">Personal Knowledge Base</p>
        </div>

        <div className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === item.id
                  ? "bg-aqua-cyan/10 text-aqua-cyan"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {activeTab === item.id && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-aqua-cyan shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto px-6 py-4">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Local Mode</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-black relative flex flex-col">
        {activeTab === "lint" || activeTab === "wiki" ? (
          <div className="h-full animate-fade-in flex-1">
            {renderTab()}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 lg:p-8 flex-1">
            <div className="mx-auto max-w-5xl animate-fade-in pb-20 lg:pb-0">
              {renderTab()}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation (Persistent) */}
      <nav className="lg:hidden flex border-t border-white/5 bg-amoled-gray px-2 py-1 flex-shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-all duration-200 ${
              activeTab === item.id
                ? "text-aqua-cyan"
                : "text-white/40"
            }`}
          >
            <item.icon size={18} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
