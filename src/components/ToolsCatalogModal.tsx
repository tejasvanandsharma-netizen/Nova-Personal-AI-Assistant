/**
 * NOVA Tools Catalog Modal
 * Complete interactive reference of all 21 desktop and browser tools,
 * their JSON schemas, and security permission classifications.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Terminal, X, ShieldCheck, ShieldAlert, ShieldX, Play, Search } from 'lucide-react';
import { TOOLS_REGISTRY } from '../lib/toolsRegistry';
import { ToolDefinition } from '../types';

interface ToolsCatalogModalProps {
  onTestTool: (toolName: string, params: Record<string, any>) => void;
  onClose: () => void;
}

export const ToolsCatalogModal: React.FC<ToolsCatalogModalProps> = ({
  onTestTool,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<ToolDefinition>(TOOLS_REGISTRY[0]);

  const filteredTools = TOOLS_REGISTRY.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getPermissionBadge = (perm: string) => {
    switch (perm) {
      case 'SAFE':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            <ShieldCheck className="w-3 h-3" />
            <span>SAFE</span>
          </span>
        );
      case 'CONFIRM':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <ShieldAlert className="w-3 h-3" />
            <span>CONFIRM</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 border border-rose-500/40 text-rose-300">
            <ShieldX className="w-3 h-3" />
            <span>BLOCKED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-5xl h-[85vh] rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-cyan-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
                NOVA TOOL SYSTEM & FUNCTION INTERFACES (21 TOOLS)
              </h3>
              <p className="font-mono text-xs text-slate-400">
                Typed schemas, permission tiers, and companion bridge requirements
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

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Tools List & Filter */}
          <div className="w-full md:w-80 border-r border-cyan-500/20 flex flex-col bg-slate-950/60">
            {/* Search */}
            <div className="p-3 border-b border-cyan-500/15">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter 21 tools..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/60 border border-cyan-500/25 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Category pills */}
              <div className="flex items-center space-x-1 mt-2 overflow-x-auto scrollbar-none">
                {['all', 'system', 'file', 'browser', 'media', 'communication'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                      selectedCategory === cat
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-cyan-500/20">
              {filteredTools.map((tool) => {
                const isSelected = selectedTool.name === tool.name;
                return (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => setSelectedTool(tool)}
                    className={`w-full text-left p-2.5 rounded-xl font-mono text-xs transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400/50 text-cyan-100 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                        : 'bg-slate-900/30 border-transparent hover:bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-cyan-300">{tool.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{tool.description}</div>
                    </div>
                    {getPermissionBadge(tool.permission)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Tool Schema Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-900/30 scrollbar-thin scrollbar-thumb-cyan-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-mono text-lg font-bold text-cyan-300">
                    {selectedTool.name}
                  </h4>
                  {getPermissionBadge(selectedTool.permission)}
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {selectedTool.category}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1 font-sans">
                  {selectedTool.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Generate sample default parameters
                  const defaultParams: Record<string, any> = {};
                  Object.entries(selectedTool.parameters.properties).forEach(([k, v]) => {
                    const prop = v as { type?: string; description?: string };
                    defaultParams[k] = prop.type === 'string' ? (k.includes('Path') ? 'C:\\Users\\User\\Documents' : 'sample') : 10;
                  });
                  onTestTool(selectedTool.name, defaultParams);
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>INVOKE TEST</span>
              </button>
            </div>

            {/* Requires Bridge Notice */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 font-mono text-xs flex items-center justify-between text-slate-300">
              <span>Execution Mechanism:</span>
              <span className="text-cyan-300 font-semibold">
                {selectedTool.requiresBridge
                  ? 'Local Windows Companion Bridge (Win32 / PowerShell)'
                  : 'Web / Sandbox Automation'}
              </span>
            </div>

            {/* Parameters Schema */}
            <div className="space-y-2 font-mono">
              <h5 className="text-xs uppercase text-cyan-400 tracking-wider font-semibold">
                PARAMETERS SCHEMA
              </h5>
              <div className="space-y-2">
                {Object.entries(selectedTool.parameters.properties).map(([propName, v]) => {
                  const prop = v as { type?: string; description?: string };
                  return (
                    <div
                      key={propName}
                      className="p-3 rounded-xl bg-black/60 border border-cyan-500/15 text-xs space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-300 font-semibold">{propName}</span>
                        <span className="text-slate-500">({prop.type || 'any'})</span>
                        {selectedTool.parameters.required.includes(propName) && (
                          <span className="text-[10px] text-rose-400 bg-rose-950/60 px-1.5 rounded border border-rose-500/30 font-bold">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">{prop.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* JSON Schema Definition */}
            <div className="space-y-2 font-mono">
              <h5 className="text-xs uppercase text-cyan-400 tracking-wider font-semibold">
                RAW JSON DEFINITION
              </h5>
              <pre className="p-3.5 rounded-xl bg-black/80 border border-cyan-500/20 text-[11px] text-cyan-200/90 overflow-x-auto">
                {JSON.stringify(selectedTool, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
