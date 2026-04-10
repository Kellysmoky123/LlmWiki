// src/pages/SettingsPage.tsx
import { useState } from "react";
import { useSettingsStore, Settings } from "../store/settings.store";
import { open } from "@tauri-apps/plugin-dialog";
import { Folder, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { ensureWikiStructure } from "../wiki/writer";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    customBaseUrl: settings.customBaseUrl,
    maxTokensPerRequest: settings.maxTokensPerRequest,
    rateLimitRpm: settings.rateLimitRpm,
    autoSaveQueries: settings.autoSaveQueries,
    userName: settings.userName
  });
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error", message: string }>({ type: "idle", message: "" });

  const handlePickFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected && typeof selected === "string") {
      await settings.setWikiPath(selected);
      const result = await ensureWikiStructure(selected);
      if (result.ok) {
        setStatus({ type: "success", message: "Wiki folder initialized successfully!" });
      } else {
        setStatus({ type: "error", message: `Failed to initialize wiki: ${result.error}` });
      }
    }
  };

  const handleSave = async () => {
    try {
      await settings.setSettings(localSettings);
      setStatus({ type: "success", message: "Settings saved successfully!" });
      setTimeout(() => setStatus({ type: "idle", message: "" }), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setStatus({ type: "error", message: `Failed to save settings: ${error instanceof Error ? error.message : error}` });
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-3xl font-bold text-white">Project Settings</h2>
        <p className="text-white/40">Configure your local knowledge base and LLM access.</p>
      </header>

      {status.type !== "idle" && (
        <div className={`flex items-center gap-3 rounded-xl p-4 animate-fade-in ${
          status.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {status.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{status.message}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Wiki Storage */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider text-[10px] text-white/50">Storage</h3>
          <div className="glass-card p-6">
            <label className="mb-2 block text-sm font-medium text-white/70">Wiki Folder Path</label>
            <div className="flex gap-4">
              <input
                type="text"
                readOnly
                value={settings.wikiPath}
                className="flex-1 rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white/50 outline-none"
                placeholder="No folder selected"
              />
              <button
                onClick={handlePickFolder}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/20"
              >
                <Folder size={18} />
                Select Folder
              </button>
            </div>
            <p className="mt-2 text-xs text-white/30">All wiki files and indices will be stored in this directory.</p>
          </div>
        </section>

        {/* Profile */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider text-[10px] text-white/50">Profile</h3>
          <div className="glass-card p-6">
            <label className="mb-2 block text-sm font-medium text-white/70">Display Name</label>
            <input
              type="text"
              value={localSettings.userName}
              onChange={(e) => setLocalSettings({ ...localSettings, userName: e.target.value })}
              className="w-full rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-aqua-cyan/50 max-w-md"
              placeholder="e.g. Alice"
            />
            <p className="mt-2 text-xs text-white/30">The name displayed on your dashboard.</p>
          </div>
        </section>

        {/* LLM Provider */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider text-[10px] text-white/50">LLM Configuration</h3>
          <div className="glass-card space-y-6 p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Provider</label>
                <select
                  value={localSettings.provider}
                  onChange={(e) => setLocalSettings({ ...localSettings, provider: e.target.value as Settings["provider"] })}
                  className="w-full rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-aqua-cyan/50"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google Gemini</option>
                  <option value="custom">Custom (OpenAI Compatible)</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Model Name</label>
                <input
                  type="text"
                  value={localSettings.model}
                  onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                  className="w-full rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-aqua-cyan/50"
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet-20240620"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">API Key</label>
              <input
                type="password"
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                className="w-full rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-aqua-cyan/50"
                placeholder="sk-..."
              />
            </div>

            {localSettings.provider === "custom" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Custom Base URL</label>
                <input
                  type="text"
                  value={localSettings.customBaseUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, customBaseUrl: e.target.value })}
                  className="w-full rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-aqua-cyan/50"
                  placeholder="http://localhost:11434/v1"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">Rate Limit (Requests per Minute)</label>
              <input
                type="number"
                min="1"
                value={localSettings.rateLimitRpm}
                onChange={(e) => setLocalSettings({ ...localSettings, rateLimitRpm: parseInt(e.target.value) || 60 })}
                className="w-full rounded-lg border border-white/5 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-aqua-cyan/50 max-w-xs"
              />
              <p className="mt-2 text-[10px] text-white/30 uppercase tracking-wide">Limits LLM API calls to avoid hitting sudden bursts (429 errors).</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-full bg-aqua-cyan px-8 py-3 font-bold text-black transition-all hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:brightness-110"
              >
                <Save size={18} />
                Save Settings
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
