/**
 * NOVA Active Task Execution & Holographic Action Stage
 *
 * Provides immediate on-screen execution for tasks triggered by voice or text:
 * - Real YouTube Player / Music launcher with search embedding & native app opener
 * - Live Google Search Grounded Answers (Weather, Temperature, Date, Recipes, Real-time Facts)
 * - Interactive Sci-Fi Calculator
 * - Real-Time Date & Time Atomic Clock
 * - Real App launcher cards (WhatsApp, Notepad, Chrome, VS Code)
 * Styled in Royal Blue & Onyx Black.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  X,
  Play,
  Search,
  Music,
  CloudSun,
  Calendar,
  Clock,
  Calculator as CalcIcon,
  MessageSquare,
  Globe,
  Sparkles,
  Maximize2,
  RefreshCw,
  FileText,
  Code,
  Volume2,
} from 'lucide-react';

export interface ActiveTaskPayload {
  type: 'youtube' | 'search' | 'weather' | 'datetime' | 'calculator' | 'app' | 'recipe';
  title: string;
  subtitle?: string;
  query?: string;
  url?: string;
  answer?: string;
  sources?: Array<{ title: string; url: string }>;
  details?: Record<string, any>;
}

interface ActiveTaskStageProps {
  task: ActiveTaskPayload | null;
  onClose: () => void;
  onSpeakText?: (text: string) => void;
}

export const ActiveTaskStage: React.FC<ActiveTaskStageProps> = ({
  task,
  onClose,
  onSpeakText,
}) => {
  // Calculator state
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');

  if (!task) return null;

  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (val === '=') {
      try {
        // Safe evaluation for basic arithmetic
        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcResult(String(res));
      } catch {
        setCalcResult('Error');
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  const openExternalUrl = (url?: string) => {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Popup blocked:', e);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-14 right-4 sm:right-6 z-40 w-[92vw] sm:w-[480px] max-h-[82vh] rounded-2xl bg-black/95 border-2 border-blue-500/80 shadow-[0_0_35px_rgba(37,99,235,0.45)] backdrop-blur-2xl flex flex-col overflow-hidden font-sans"
      >
        {/* Holographic Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-950 via-slate-950 to-blue-950 border-b border-blue-500/40">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs uppercase tracking-wider text-blue-200 font-bold flex items-center gap-1.5">
              {task.type === 'youtube' && <Music className="w-3.5 h-3.5 text-blue-400" />}
              {task.type === 'search' && <Search className="w-3.5 h-3.5 text-blue-400" />}
              {task.type === 'weather' && <CloudSun className="w-3.5 h-3.5 text-amber-400" />}
              {task.type === 'datetime' && <Calendar className="w-3.5 h-3.5 text-cyan-400" />}
              {task.type === 'calculator' && <CalcIcon className="w-3.5 h-3.5 text-emerald-400" />}
              {task.type === 'app' && <Globe className="w-3.5 h-3.5 text-blue-400" />}
              {task.type === 'recipe' && <Sparkles className="w-3.5 h-3.5 text-rose-400" />}
              <span>{task.title}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {task.url && (
              <button
                onClick={() => openExternalUrl(task.url)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all shadow-md shadow-blue-600/30"
                title="Open in new window / full app"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-blue-900/40 text-slate-400 hover:text-white transition-colors"
              title="Close stage"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 overflow-y-auto space-y-3 max-h-[70vh] scrollbar-thin scrollbar-thumb-blue-600/40">
          
          {/* 1. YOUTUBE / MUSIC PLAYER STAGE */}
          {task.type === 'youtube' && (
            <div className="space-y-3">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-blue-500/50 shadow-inner">
                {task.query ? (
                  <iframe
                    title="YouTube Video Player"
                    src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(task.query)}&autoplay=1`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <iframe
                    title="YouTube Video Player"
                    src="https://www.youtube.com/embed/videoseries?list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ55M&autoplay=1"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30">
                <div>
                  <div className="text-xs font-semibold text-white">Playing: {task.query || 'Bollywood / Trending'}</div>
                  <div className="text-[11px] text-blue-300 font-mono">Dispatched to YouTube Music Engine</div>
                </div>

                <button
                  onClick={() => openExternalUrl(task.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(task.query || 'music')}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/40 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Open in YouTube App</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. REAL-TIME GOOGLE SEARCH & AI GROUNDED ANSWER */}
          {(task.type === 'search' || task.type === 'weather' || task.type === 'recipe') && (
            <div className="space-y-3">
              {task.subtitle && (
                <div className="text-xs text-blue-300 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{task.subtitle}</span>
                </div>
              )}

              {/* Verified Answer Display */}
              <div className="p-3.5 rounded-xl bg-blue-950/50 border border-blue-500/40 text-blue-100 text-xs leading-relaxed space-y-2">
                <div className="flex items-center justify-between border-b border-blue-500/30 pb-1.5">
                  <span className="font-mono text-[10px] text-blue-300 uppercase tracking-wider">
                    {task.type === 'weather' ? 'LIVE WEATHER DATA' : task.type === 'recipe' ? 'RECIPE GUIDE' : 'FACTUAL SEARCH GROUNDING'}
                  </span>
                  {onSpeakText && task.answer && (
                    <button
                      onClick={() => onSpeakText(task.answer!)}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-white font-mono"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>LISTEN</span>
                    </button>
                  )}
                </div>

                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-100 font-medium">
                  {task.answer}
                </div>
              </div>

              {/* Sources & Citations */}
              {task.sources && task.sources.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Sources / Links:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {task.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 border border-blue-500/30 hover:border-blue-400 text-blue-300 hover:text-white text-[10px] font-mono transition-all"
                      >
                        <span className="truncate max-w-[180px]">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                {task.url && (
                  <button
                    onClick={() => openExternalUrl(task.url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
                  >
                    <span>View More on Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. ATOMIC REAL-TIME DATE & TIME STAGE */}
          {task.type === 'datetime' && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/80 via-black to-blue-950/80 border border-blue-500/50 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Clock className="w-5 h-5 animate-pulse" />
                <span className="font-mono text-2xl font-black tracking-widest text-white">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="text-sm font-semibold text-blue-200">
                {new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <p className="text-xs text-blue-300 pt-2 border-t border-blue-500/20 font-medium">
                {task.answer}
              </p>
            </div>
          )}

          {/* 4. INTERACTIVE SCI-FI CALCULATOR */}
          {task.type === 'calculator' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/50 space-y-3">
              {/* Display screen */}
              <div className="p-3 rounded-lg bg-black/90 border border-emerald-500/30 text-right font-mono">
                <div className="text-xs text-slate-400 min-h-[16px]">{calcInput || '0'}</div>
                <div className="text-xl font-bold text-emerald-400 min-h-[28px]">{calcResult || '0'}</div>
              </div>

              {/* Grid buttons */}
              <div className="grid grid-cols-4 gap-2 text-xs font-mono font-bold">
                {['7', '8', '9', '/'].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleCalcBtn(b)}
                    className="p-2.5 rounded-lg bg-blue-950/60 hover:bg-blue-600 text-white border border-blue-500/30 transition-all"
                  >
                    {b}
                  </button>
                ))}
                {['4', '5', '6', '*'].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleCalcBtn(b)}
                    className="p-2.5 rounded-lg bg-blue-950/60 hover:bg-blue-600 text-white border border-blue-500/30 transition-all"
                  >
                    {b}
                  </button>
                ))}
                {['1', '2', '3', '-'].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleCalcBtn(b)}
                    className="p-2.5 rounded-lg bg-blue-950/60 hover:bg-blue-600 text-white border border-blue-500/30 transition-all"
                  >
                    {b}
                  </button>
                ))}
                {['C', '0', '=', '+'].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleCalcBtn(b)}
                    className={`p-2.5 rounded-lg font-bold border transition-all ${
                      b === '='
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                        : b === 'C'
                        ? 'bg-rose-950/80 hover:bg-rose-600 text-rose-200 hover:text-white border-rose-500/40'
                        : 'bg-blue-950/60 hover:bg-blue-600 text-white border-blue-500/30'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => openExternalUrl('https://www.google.com/search?q=calculator')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/40 hover:bg-blue-600 text-blue-200 hover:text-white text-xs font-semibold transition-all"
                >
                  <span>Open Full Google Calculator</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 5. APP LAUNCHER STAGE (WhatsApp, Chrome, Notepad, etc.) */}
          {task.type === 'app' && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-blue-600/30 border border-blue-400 text-blue-300">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{task.title}</h3>
                  <p className="text-xs text-blue-300">{task.subtitle || 'Ready to launch application'}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {task.answer}
              </p>

              {task.url && (
                <button
                  onClick={() => openExternalUrl(task.url)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/40 transition-all"
                >
                  <span>Launch Application Now</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
