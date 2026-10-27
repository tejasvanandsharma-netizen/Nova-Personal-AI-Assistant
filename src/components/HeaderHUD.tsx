/**
 * NOVA Top Header HUD
 * Displays futuristic telemetry, local agent bridge status indicator,
 * memory trigger, tools catalog trigger, and system state badges.
 * Styled in Royal Blue & Onyx Black.
 */

import React from 'react';
import {
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Sliders,
  FolderTree,
  Terminal,
  Server,
  StopCircle,
  Database,
  Sparkles,
  Bot,
  Smartphone,
} from 'lucide-react';
import { AgentStatus, LocalBridgeConfig, AvatarMode } from '../types';

interface HeaderHUDProps {
  status: AgentStatus;
  bridgeConfig: LocalBridgeConfig;
  avatarMode: AvatarMode;
  onToggleAvatarMode: () => void;
  onOpenBridgeModal: () => void;
  onOpenToolsModal: () => void;
  onOpenMemoryModal: () => void;
  onOpenInstallModal?: () => void;
  onEmergencyStop: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  status,
  bridgeConfig,
  avatarMode,
  onToggleAvatarMode,
  onOpenBridgeModal,
  onOpenToolsModal,
  onOpenMemoryModal,
  onOpenInstallModal,
  onEmergencyStop,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'LISTENING':
        return 'text-blue-300 border-blue-500/70 bg-blue-950/80 shadow-[0_0_15px_rgba(37,99,235,0.5)]';
      case 'THINKING':
        return 'text-indigo-300 border-indigo-500/70 bg-indigo-950/80 shadow-[0_0_15px_rgba(99,102,241,0.5)]';
      case 'EXECUTING':
        return 'text-blue-200 border-blue-400 bg-blue-900/80 shadow-[0_0_18px_rgba(59,130,246,0.6)] animate-pulse';
      case 'COMPLETED':
        return 'text-emerald-300 border-emerald-500/70 bg-emerald-950/80 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case 'ERROR':
        return 'text-rose-300 border-rose-500/70 bg-rose-950/80 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      case 'IDLE':
      default:
        return 'text-blue-300 border-blue-600/40 bg-black/80';
    }
  };

  return (
    <header
      id="nova-header-hud"
      className="w-full px-4 py-2.5 bg-black/90 border-b border-blue-600/40 backdrop-blur-xl flex items-center justify-between z-30 shadow-lg shadow-blue-950/30"
    >
      {/* Brand & System Code */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-400 p-0.5 flex items-center justify-center shadow-[0_0_18px_rgba(37,99,235,0.6)]">
            <div className="w-full h-full bg-black rounded-[6px] flex items-center justify-center font-mono font-bold text-xs text-blue-400">
              N
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-bold text-sm tracking-widest text-white">
                NOVA
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/90 border border-blue-500/50 text-blue-300">
                ROYAL BLUE AI
              </span>
            </div>
            <p className="font-mono text-[9px] text-blue-400/80">
              FEMALE DESKTOP AGENT // WIN32 BRIDGE
            </p>
          </div>
        </div>

        {/* Global Agent State Pill */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-mono font-semibold transition-all ${getStatusColor()}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>STATUS: {status}</span>
        </div>
      </div>

      {/* Controls: Mode, Bridge Indicator & Real Tool Menus */}
      <div className="flex items-center space-x-2">
        {/* Avatar Mode Toggle */}
        <button
          type="button"
          onClick={onToggleAvatarMode}
          className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
            avatarMode === 'female_ai'
              ? 'bg-blue-950/90 border-blue-500/70 text-blue-200 hover:bg-blue-900/80 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'bg-black/80 border-blue-600/40 text-blue-400 hover:bg-blue-950/60'
          }`}
          title="Toggle between 3D Female AI Mode (NOVA) and Classic Orb Core Mode"
        >
          {avatarMode === 'female_ai' ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold">NOVA (3D FEMALE AI)</span>
            </>
          ) : (
            <>
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold">ORB CORE</span>
            </>
          )}
        </button>

        {/* Local Agent Connection Indicator */}
        <button
          type="button"
          onClick={onOpenBridgeModal}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
            bridgeConfig.connected
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
              : bridgeConfig.simulationMode
              ? 'bg-blue-950/70 border-blue-600/50 text-blue-300 hover:bg-blue-900/60 shadow-[0_0_12px_rgba(37,99,235,0.3)]'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300 hover:bg-rose-900/60'
          }`}
          title="Configure Local Windows Companion Bridge"
        >
          <Server className="w-3.5 h-3.5" />
          <span className="font-semibold">
            AGENT: {bridgeConfig.connected ? 'CONNECTED' : bridgeConfig.simulationMode ? 'SIMULATOR ACTIVE' : 'DISCONNECTED'}
          </span>
        </button>

        {/* Tools Catalog Button */}
        <button
          type="button"
          onClick={onOpenToolsModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-blue-950/80 border border-blue-600/40 text-xs font-mono text-blue-200 transition-colors shadow-sm"
          title="View all 21 desktop tools and permission schemas"
        >
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">TOOLS (21)</span>
        </button>

        {/* Memory Service Button */}
        <button
          type="button"
          onClick={onOpenMemoryModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-blue-950/80 border border-blue-600/40 text-xs font-mono text-blue-200 transition-colors shadow-sm"
          title="User preferences, assistant personality, custom shortcuts"
        >
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">MEMORY</span>
        </button>

        {/* Mobile / PWA App Install Trigger */}
        {onOpenInstallModal && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 border border-blue-400 text-xs font-mono text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold animate-pulse"
            title="Download & Install NOVA as App on Phone"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-200" />
            <span>INSTALL APP 📲</span>
          </button>
        )}

        {/* Emergency Stop Button */}
        <button
          type="button"
          onClick={onEmergencyStop}
          className="p-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 transition-colors flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.4)]"
          title="Emergency Global Stop (Abort all actions)"
        >
          <StopCircle className="w-4 h-4 text-rose-400" />
        </button>
      </div>
    </header>
  );
};
