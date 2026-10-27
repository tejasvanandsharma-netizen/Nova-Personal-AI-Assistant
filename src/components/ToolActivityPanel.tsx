/**
 * NOVA Tool Activity Panel
 * Displays live timeline of agent activities, security status, and step execution.
 * Styled in Royal Blue & Onyx Black.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Server,
  Zap,
} from 'lucide-react';
import { ActivityTimelineItem, TaskPlanStep, AgentStatus } from '../types';

interface ToolActivityPanelProps {
  timeline: ActivityTimelineItem[];
  activeStep?: TaskPlanStep | null;
  status: AgentStatus;
  bridgeConnected: boolean;
  simulationMode: boolean;
}

export const ToolActivityPanel: React.FC<ToolActivityPanelProps> = ({
  timeline,
  activeStep,
  status,
  bridgeConnected,
  simulationMode,
}) => {
  return (
    <div
      id="nova-tool-activity-panel"
      className="flex flex-col h-full rounded-2xl bg-black/85 border border-blue-600/40 backdrop-blur-xl shadow-2xl shadow-blue-950/40 overflow-hidden"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-600/30 bg-gradient-to-r from-blue-950/80 via-black to-blue-950/80">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
          <h2 className="font-mono text-xs uppercase tracking-wider text-blue-200 font-semibold">
            AGENT_TELEMETRY // LIVE ACTIVITY
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
          <span
            className={`w-2 h-2 rounded-full ${
              bridgeConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : simulationMode
                ? 'bg-blue-400 shadow-[0_0_8px_#3b82f6]'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-blue-300/80 uppercase font-bold">
            {bridgeConnected ? 'BRIDGE LIVE' : simulationMode ? 'SIMULATOR ACTIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Active Step Highlight */}
      {activeStep && (
        <div className="p-3 border-b border-blue-600/30 bg-blue-950/50">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] text-blue-300 uppercase tracking-wider flex items-center space-x-1">
              <Zap className="w-3 h-3 text-blue-400 animate-bounce" />
              <span>ACTIVE TOOL INVOCATION</span>
            </span>
            <span className="font-mono text-[10px] text-blue-200 px-1.5 py-0.5 rounded bg-blue-900/60 border border-blue-500/40">
              {activeStep.permission}
            </span>
          </div>
          <div className="font-mono text-xs text-white font-medium">
            {activeStep.title}
          </div>
          <div className="text-[11px] text-blue-300/80 font-mono mt-0.5">
            {activeStep.description}
          </div>
        </div>
      )}

      {/* Activity Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-600/30 scrollbar-track-transparent">
        {timeline.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono text-xs">
            <Server className="w-8 h-8 mb-2 text-blue-500/30" />
            <p className="text-blue-300/70">Awaiting user commands...</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Task planning, tool calls, and security checks will stream here in real-time.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {timeline.map((item, idx) => {
              const isLatest = idx === timeline.length - 1;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    item.type === 'error'
                      ? 'bg-rose-950/70 border-rose-500/40 text-rose-200 shadow-md'
                      : item.type === 'security'
                      ? 'bg-amber-950/70 border-amber-500/40 text-amber-200 shadow-md'
                      : item.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200 shadow-md'
                      : item.type === 'tool'
                      ? 'bg-[#04081c] border-blue-500/30 text-blue-200 shadow-md'
                      : isLatest
                      ? 'bg-blue-950/60 border-blue-500/40 text-blue-200'
                      : 'bg-black/60 border-blue-900/30 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px]">
                    <span className="flex items-center space-x-1 font-bold">
                      {item.type === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                      {item.type === 'security' && <ShieldAlert className="w-3 h-3 text-amber-400" />}
                      {item.type === 'success' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                      {item.type === 'tool' && <Terminal className="w-3 h-3 text-blue-400" />}
                      {item.type === 'plan' && <Clock className="w-3 h-3 text-blue-400" />}
                      <span>{item.label}</span>
                    </span>
                    <span className="text-slate-500">{item.timestamp}</span>
                  </div>
                  {item.details && (
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      {item.details}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
