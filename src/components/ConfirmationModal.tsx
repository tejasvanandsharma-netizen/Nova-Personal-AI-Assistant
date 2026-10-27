/**
 * NOVA Confirmation Modal
 * Required before executing CONFIRM-tier actions (delete files, send messages, move important data).
 */

import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, X, ShieldAlert, FileText, Send, HardDrive } from 'lucide-react';
import { TaskPlanStep } from '../types';

interface ConfirmationModalProps {
  step: TaskPlanStep;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  step,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl bg-slate-950 border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
      >
        {/* Header Alert Ribbon */}
        <div className="flex items-center space-x-3 px-5 py-4 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-amber-500/30">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40">
                SECURITY VERIFICATION // CONFIRMATION REQUIRED
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-100 mt-1 font-sans">
              Authorize Action: {step.title}
            </h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-300">
            <span className="text-cyan-400 font-semibold font-mono">NOVA</span> is requesting permission to execute this operation on your Windows PC.
          </div>

          {/* Risk Warning Callout */}
          {step.riskWarning && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200/90 font-mono">
              <span className="font-bold text-amber-400">Policy Rationale: </span>
              {step.riskWarning}
            </div>
          )}

          {/* Action & Parameters Details */}
          <div className="rounded-xl bg-slate-900/80 border border-cyan-500/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Target Tool:</span>
              <span className="text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30">
                {step.tool}
              </span>
            </div>

            <div className="text-xs font-mono text-slate-400">
              <span>Parameters & Target:</span>
              <pre className="mt-1.5 p-2 rounded-lg bg-black/70 border border-cyan-500/20 text-[11px] text-cyan-200 overflow-x-auto">
                {JSON.stringify(step.parameters, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 px-5 py-4 bg-slate-900/90 border-t border-cyan-500/20">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>CANCEL</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
          >
            <Check className="w-4 h-4" />
            <span>AUTHORIZE & EXECUTE</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
