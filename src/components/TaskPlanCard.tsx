/**
 * NOVA Execution Plan Inspector & Active Task Card
 * Styled in Royal Blue & Onyx Black.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Square,
  Sparkles,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Terminal,
  Activity,
  Cpu,
} from 'lucide-react';
import { AgentTaskPlan, TaskPlanStep, ToolExecutionState } from '../types';

interface TaskPlanCardProps {
  plan: AgentTaskPlan | null;
  onEmergencyStop: () => void;
  onAuthorizeStep: (stepId: string) => void;
  onRejectStep: (stepId: string) => void;
}

export const TaskPlanCard: React.FC<TaskPlanCardProps> = ({
  plan,
  onEmergencyStop,
  onAuthorizeStep,
  onRejectStep,
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  if (!plan) return null;

  const isRunning = plan.status === 'RUNNING' || plan.status === 'PLANNING';
  const isAwaitingApproval = plan.status === 'AWAITING_APPROVAL';
  const currentStep = plan.steps[plan.currentStepIndex];

  const getStatusBadge = (status: ToolExecutionState) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/80 text-slate-400 border border-slate-800">
            <Clock className="w-2.5 h-2.5" />
            <span>PENDING</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-950 text-blue-200 border border-blue-400/60 shadow-[0_0_12px_rgba(37,99,235,0.6)] animate-pulse">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>RUNNING</span>
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span>SUCCESS</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-500/40">
            <XCircle className="w-2.5 h-2.5 text-rose-400" />
            <span>FAILED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-700 line-through">
            <Ban className="w-2.5 h-2.5" />
            <span>CANCELLED</span>
          </span>
        );
    }
  };

  const getPlanStatusPill = () => {
    switch (plan.status) {
      case 'PLANNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">PLANNING</span>;
      case 'RUNNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-950 text-blue-200 border border-blue-400/60 shadow-[0_0_12px_rgba(37,99,235,0.5)] animate-pulse">EXECUTING TASK</span>;
      case 'AWAITING_APPROVAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse">APPROVAL REQUIRED</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">TASK COMPLETED</span>;
      case 'FAILED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-950 text-rose-300 border border-rose-500/40">TASK FAILED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-900 text-slate-400 border border-slate-700">TASK CANCELLED</span>;
    }
  };

  return (
    <div className="w-full rounded-2xl bg-black/85 border border-blue-600/40 backdrop-blur-xl shadow-[0_0_35px_rgba(37,99,235,0.15)] overflow-hidden transition-all">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-blue-950/80 via-black to-blue-950/80 border-b border-blue-600/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/40">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-blue-400 tracking-wider">
                EXECUTION PLAN
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                [{plan.taskId}]
              </span>
            </div>
            <p className="text-xs text-blue-100 font-sans mt-0.5 line-clamp-1">
              {plan.intent}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {getPlanStatusPill()}

          {/* Emergency Stop Button */}
          {(isRunning || isAwaitingApproval) && (
            <button
              type="button"
              onClick={onEmergencyStop}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-mono bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all animate-pulse"
              title="Cancel the running task immediately"
            >
              <Square className="w-3.5 h-3.5" />
              <span>EMERGENCY STOP</span>
            </button>
          )}
        </div>
      </div>

      {/* Model Reasoning Callout */}
      {plan.reasoning && (
        <div className="px-5 py-2.5 bg-blue-950/30 border-b border-blue-600/20 flex items-start space-x-2 text-xs font-mono text-blue-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong className="text-blue-200">NOVA Task Reasoning: </strong>
            {plan.reasoning}
          </span>
        </div>
      )}

      {/* Current Step Active Spotlight */}
      {isRunning && currentStep && (
        <div className="px-5 py-3 bg-gradient-to-r from-blue-950/60 via-[#071336] to-black border-b border-blue-500/40">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-blue-300 flex items-center space-x-1.5 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>
                EXECUTING STEP {plan.currentStepIndex + 1} OF {plan.steps.length}
              </span>
            </span>
            <span className="text-slate-400 text-[11px]">
              Timeout Limit: {currentStep.timeoutMs || 10000}ms
            </span>
          </div>
          <div className="font-mono text-sm text-white font-semibold">
            [{currentStep.tool}] - {currentStep.title}
          </div>
          <div className="text-xs text-blue-200/90 font-mono mt-1">
            {currentStep.description}
          </div>
        </div>
      )}

      {/* Approval Gate for CONFIRM-level steps */}
      {isAwaitingApproval && currentStep && (
        <div className="p-4 bg-amber-950/40 border-b border-amber-500/40 text-amber-200 text-xs font-mono space-y-2.5">
          <div className="flex items-center space-x-2 font-bold text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>APPROVAL REQUIRED FOR DESKTOP MODIFICATION</span>
          </div>
          <p className="font-sans text-slate-200">
            Step {plan.currentStepIndex + 1}: <strong>{currentStep.title}</strong> requires your authorization before execution.
          </p>
          {currentStep.riskWarning && (
            <p className="text-amber-300/90 italic text-[11px]">
              Security Notice: {currentStep.riskWarning}
            </p>
          )}
          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={() => onAuthorizeStep(currentStep.id)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/30"
            >
              Authorize & Run Step
            </button>
            <button
              type="button"
              onClick={() => onRejectStep(currentStep.id)}
              className="px-3 py-1.5 rounded-lg bg-black/80 hover:bg-rose-950 border border-rose-500/50 text-rose-300 transition-all"
            >
              Reject Action
            </button>
          </div>
        </div>
      )}

      {/* Sequential Steps List */}
      <div className="p-4 space-y-2.5 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600/30 scrollbar-track-transparent">
        {plan.steps.map((step, idx) => {
          const isExpanded = expandedStepId === step.id;
          const isCurrent = idx === plan.currentStepIndex && isRunning;

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all text-xs font-mono overflow-hidden ${
                isCurrent
                  ? 'border-blue-500 bg-blue-950/50 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                  : step.status === 'SUCCESS'
                  ? 'border-emerald-500/30 bg-black/60'
                  : step.status === 'FAILED'
                  ? 'border-rose-500/30 bg-rose-950/20'
                  : 'border-blue-900/30 bg-black/40'
              }`}
            >
              <div
                onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-blue-950/30 transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-md bg-blue-950 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-white">{step.title}</div>
                    <div className="text-[11px] text-blue-300/80 font-mono">[{step.tool}]</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(step.status)}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="p-3 pt-0 border-t border-blue-600/20 space-y-2 text-[11px] bg-black/80">
                  <p className="text-slate-300 font-sans">{step.description}</p>
                  <div>
                    <span className="text-blue-400 font-bold">Parameters:</span>
                    <pre className="p-2 mt-1 rounded bg-black/90 border border-blue-600/30 overflow-x-auto text-[10px] text-blue-200">
                      {JSON.stringify(step.parameters, null, 2)}
                    </pre>
                  </div>

                  {step.result && (
                    <div>
                      <span className="text-emerald-400 font-bold">Execution Output:</span>
                      <pre className="p-2 mt-1 rounded bg-black/90 border border-emerald-500/30 overflow-x-auto text-[10px] text-emerald-200">
                        {JSON.stringify(step.result.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {step.error && (
                    <div className="text-rose-400 font-sans">
                      <strong>Error:</strong> {step.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Final Outcome Summary */}
      {plan.finalResult && (
        <div className="px-5 py-3 bg-gradient-to-r from-blue-950/80 via-black to-blue-950/80 border-t border-blue-600/30 text-xs font-sans text-blue-100 flex items-start space-x-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-mono text-blue-300 uppercase tracking-wide block mb-0.5">
              Task Outcome Verified:
            </strong>
            <p className="leading-relaxed">{plan.finalResult}</p>
          </div>
        </div>
      )}
    </div>
  );
};
