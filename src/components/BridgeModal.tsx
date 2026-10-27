/**
 * NOVA Local Windows Bridge Configuration & Companion Script Modal
 *
 * Explains the architectural boundary between web app and native Windows PC,
 * provides connection diagnostics to http://127.0.0.1:8765, and includes
 * the production Python companion daemon script.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Terminal,
  RefreshCw,
  Cpu,
  Laptop,
} from 'lucide-react';
import { LocalBridgeConfig } from '../types';
import { PYTHON_COMPANION_SCRIPT, WINDOWS_COMPANION_CONTRACT } from '../lib/companionScript';

interface BridgeModalProps {
  config: LocalBridgeConfig;
  onUpdateConfig: (updates: Partial<LocalBridgeConfig>) => void;
  onProbeBridge: () => Promise<void>;
  onClose: () => void;
}

export const BridgeModal: React.FC<BridgeModalProps> = ({
  config,
  onUpdateConfig,
  onProbeBridge,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [probing, setProbing] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState(config.endpoint);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(PYTHON_COMPANION_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([PYTHON_COMPANION_SCRIPT], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nova_windows_bridge.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    setProbing(true);
    onUpdateConfig({ endpoint: customEndpoint });
    await onProbeBridge();
    setProbing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl my-8 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-cyan-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
                LOCAL WINDOWS AGENT BRIDGE ARCHITECTURE
              </h3>
              <p className="font-mono text-xs text-slate-400">
                Secure companion daemon interface for PC control (Win32 / PowerShell)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20">
          {/* Architectural Notice */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-cyan-500/30 text-xs text-slate-300 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-300 font-mono font-semibold">
              <Laptop className="w-4 h-4" />
              <span>SECURITY ARCHITECTURE PIPELINE</span>
            </div>

            {/* Visual Pipeline Flow Diagram */}
            <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/20 font-mono text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-center">
                <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                  <div className="text-cyan-300 font-bold">1. NOVA AI (Cloud)</div>
                  <div className="text-[10px] text-slate-400 mt-1">Reasoning & Tool Call</div>
                  <div className="mt-2 text-left text-[9px] text-cyan-400/80 bg-black/50 p-1.5 rounded">
                    <code>{`{\n  "tool": "open_application",\n  "appName": "notepad"\n}`}</code>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-cyan-400 font-bold">
                  <span className="hidden sm:inline">⟶ HTTP POST /execute ⟶</span>
                  <span className="sm:hidden">↓ HTTP POST /execute ↓</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">127.0.0.1:8765</span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                  <div className="text-emerald-300 font-bold">2. Local Agent (PC)</div>
                  <div className="text-[10px] text-slate-400 mt-1">Windows Subprocess</div>
                  <div className="mt-2 text-left text-[9px] text-emerald-400/80 bg-black/50 p-1.5 rounded font-mono">
                    <code>open notepad.exe<br />⟶ {`{"success": true}`}</code>
                  </div>
                </div>
              </div>
            </div>

            <p className="leading-relaxed">
              Standard web browsers run in a strict security sandbox and <strong>cannot</strong> directly execute arbitrary Windows system calls, modify files on drive C:, or capture desktop monitors.
            </p>
            <p className="leading-relaxed text-slate-400">
              NOVA uses a cleanly separated <strong>Local Agent Bridge contract</strong>. When connected to your local Windows PC daemon, tool commands are securely relayed to <code>http://127.0.0.1:8765</code>. When offline, NOVA operates in <strong>Realistic Simulator Mode</strong> so you can test and inspect all 21 tools immediately.
            </p>
          </div>

          {/* Connection Status & Mode Switch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">BRIDGE STATUS:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    config.connected
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : config.simulationMode
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {config.connected ? 'CONNECTED' : config.simulationMode ? 'SIMULATOR ACTIVE' : 'DISCONNECTED'}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-slate-400">Local Endpoint:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                    placeholder="http://127.0.0.1:8765"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={probing}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center space-x-1 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
                    <span>TEST</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Mode Toggle */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-3">
              <div className="font-mono text-xs font-semibold text-cyan-300">
                EXECUTION TARGET MODE
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If the local Windows daemon is not running on your machine, leave Simulation Mode enabled to test tool planning, task execution, and confirmations safely in the browser.
              </p>
              <label className="flex items-center space-x-2 cursor-pointer font-mono text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={config.simulationMode}
                  onChange={(e) => onUpdateConfig({ simulationMode: e.target.checked })}
                  className="rounded bg-slate-950 border-cyan-500/40 text-cyan-400 focus:ring-0"
                />
                <span>Enable Simulation Mode (Browser Safe Testing)</span>
              </label>
            </div>
          </div>

          {/* Bridge API Contract Endpoints */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase tracking-wider text-cyan-300 font-semibold">
              LOCAL BRIDGE RPC CONTRACT
            </h4>
            <div className="rounded-xl border border-cyan-500/20 bg-black/50 overflow-hidden font-mono text-xs">
              {WINDOWS_COMPANION_CONTRACT.endpoints.map((ep, i) => (
                <div key={i} className="p-2.5 border-b border-cyan-500/10 last:border-none flex items-start space-x-3">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px] text-cyan-300 font-bold">
                    {ep.method}
                  </span>
                  <div className="flex-1">
                    <span className="text-slate-200 font-semibold">{ep.path}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ep.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Python Companion Daemon Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs uppercase tracking-wider text-cyan-300 font-semibold flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>WINDOWS COMPANION DAEMON (nova_windows_bridge.py)</span>
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono flex items-center space-x-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadScript}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 text-xs font-mono flex items-center space-x-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD .PY</span>
                </button>
              </div>
            </div>

            <pre className="p-3 rounded-xl bg-black/80 border border-cyan-500/20 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-56 scrollbar-thin scrollbar-thumb-cyan-500/20">
              {PYTHON_COMPANION_SCRIPT}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-cyan-500/20 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-semibold transition-colors"
          >
            CLOSE
          </button>
        </div>
      </motion.div>
    </div>
  );
};
