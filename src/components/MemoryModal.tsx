/**
 * NOVA Memory & Personality Settings Modal
 * Configures user preferences, assistant tone, conversation summaries,
 * custom shortcut commands, and frequently used applications.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Database,
  X,
  Save,
  User,
  Bot,
  Zap,
  AppWindow,
  FileText,
  Volume2,
} from 'lucide-react';
import { MemoryData } from '../types';

interface MemoryModalProps {
  memory: MemoryData;
  onSaveMemory: (updated: MemoryData) => Promise<void>;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  memory,
  onSaveMemory,
  onClose,
}) => {
  const [formData, setFormData] = useState<MemoryData>(memory);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'preferences' | 'commands' | 'apps' | 'summaries'>('preferences');

  const handleSave = async () => {
    setSaving(true);
    await onSaveMemory(formData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl h-[80vh] rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-cyan-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
                NOVA MEMORY SERVICE & USER PROFILES
              </h3>
              <p className="font-mono text-xs text-slate-400">
                Server-persisted user preferences, speech synthesis, and custom shortcuts
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

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-cyan-500/20 bg-slate-950/40">
          {[
            { id: 'preferences', label: 'PREFERENCES & VOICE', icon: SlidersIcon },
            { id: 'commands', label: 'CUSTOM COMMANDS', icon: Zap },
            { id: 'apps', label: 'FREQUENT APPS', icon: AppWindow },
            { id: 'summaries', label: 'SUMMARIES', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-t-xl font-mono text-xs transition-all border-t border-l border-r ${
                  activeTab === tab.id
                    ? 'bg-slate-900 border-cyan-500/40 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-900/30 scrollbar-thin scrollbar-thumb-cyan-500/20">
          {activeTab === 'preferences' && (
            <div className="space-y-4 max-w-xl">
              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-slate-300">Commander / User Call-sign:</label>
                <input
                  type="text"
                  value={formData.userPreferences.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      userPreferences: { ...formData.userPreferences, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-slate-300">NOVA Persona & Tone:</label>
                <select
                  value={formData.assistantPreferences.tone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assistantPreferences: {
                        ...formData.assistantPreferences,
                        tone: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-200 text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="calm-futuristic">Calm & Futuristic (Default)</option>
                  <option value="concise">Concise & Direct</option>
                  <option value="technical">Technical & Detailed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 flex items-center justify-between">
                    <span>Voice Rate:</span>
                    <span className="text-cyan-400">{formData.userPreferences.voiceRate}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.1"
                    value={formData.userPreferences.voiceRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userPreferences: {
                          ...formData.userPreferences,
                          voiceRate: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 flex items-center justify-between">
                    <span>Voice Pitch:</span>
                    <span className="text-cyan-400">{formData.userPreferences.voicePitch}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={formData.userPreferences.voicePitch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userPreferences: {
                          ...formData.userPreferences,
                          voicePitch: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-500/15 space-y-2">
                <label className="flex items-center space-x-2 text-xs font-mono text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.userPreferences.autoSpeak}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userPreferences: {
                          ...formData.userPreferences,
                          autoSpeak: e.target.checked,
                        },
                      })
                    }
                    className="rounded bg-slate-950 border-cyan-500/40 text-cyan-400"
                  />
                  <span>Auto-speak responses after task completion</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-mono text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assistantPreferences.strictSafetyAudit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assistantPreferences: {
                          ...formData.assistantPreferences,
                          strictSafetyAudit: e.target.checked,
                        },
                      })
                    }
                    className="rounded bg-slate-950 border-cyan-500/40 text-cyan-400"
                  />
                  <span>Strict Security Audit (Enforce CONFIRM on disk writes)</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-3 font-mono">
              <p className="text-xs text-slate-400">
                Custom triggers and automated multi-tool shortcuts:
              </p>
              {formData.customCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold text-xs">
                      Trigger: "{cmd.trigger}"
                    </span>
                    <span className="text-[10px] text-slate-500">{cmd.id}</span>
                  </div>
                  <div className="text-xs text-slate-400">{cmd.description}</div>
                  <div className="text-[11px] text-cyan-400/80 bg-cyan-950/40 p-2 rounded border border-cyan-500/10">
                    Template: {cmd.templatePrompt}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="space-y-3 font-mono">
              <p className="text-xs text-slate-400">
                Frequently accessed desktop applications mapped to local shortcuts:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.frequentlyUsedApps.map((app, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-black/60 border border-cyan-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-cyan-300">{app.name}</div>
                      <div className="text-[10px] text-slate-500">{app.path}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-500/30">
                        {app.launches} runs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'summaries' && (
            <div className="space-y-3 font-mono">
              <p className="text-xs text-slate-400">
                Conversation summaries and memory context:
              </p>
              {formData.conversationSummaries.map((sum, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-black/60 border border-cyan-500/20 text-xs text-slate-300"
                >
                  {sum}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-cyan-500/20 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-500">
            LAST SYNC: {new Date(formData.lastUpdated).toLocaleDateString()}
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'SAVING...' : 'SAVE MEMORY'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

function SlidersIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}
