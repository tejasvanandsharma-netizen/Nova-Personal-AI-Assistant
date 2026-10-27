/**
 * NOVA Command Bar
 * Text input, speech-to-text microphone button, emergency STOP button,
 * and quick multi-lingual command triggers.
 * Styled in Royal Blue & Onyx Black.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Send, Square, Sparkles, CornerDownLeft, Music, Search, Calculator } from 'lucide-react';
import { AgentStatus } from '../types';

interface CommandBarProps {
  onSendMessage: (text: string) => void;
  onEmergencyStop: () => void;
  status: AgentStatus;
  isListening: boolean;
  onToggleListening: () => void;
  language: 'English' | 'Hindi' | 'Hinglish';
  onLanguageChange: (lang: 'English' | 'Hindi' | 'Hinglish') => void;
  liveTranscript?: string;
}

interface QuickSuggestion {
  text: string;
  label?: string;
  isBlocked?: boolean;
  isConfirm?: boolean;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { text: 'song play karo', label: '🎵 Song Play Karo' },
  { text: 'Arijit Singh ka gana chalao', label: '🎶 Arijit Singh Song' },
  { text: 'calculator open karo', label: '🧮 Open Calculator' },
  { text: 'Google search latest AI news', label: '🌐 Web Search News' },
  { text: 'notes open karo', label: '📝 Open Notes' },
  { text: 'system status check karo', label: '⚡ System Status' },
  { text: 'terminal kholo', label: '💻 Open Terminal' },
  { text: 'Chrome kholo aur YouTube chalao', label: '🌐 Open YouTube' },
  { text: 'Namaste NOVA, aap kaun ho?', label: '🌸 Who are you?' },
  { text: 'take_screenshot', label: '📸 Take Screenshot' },
  { text: 'volume_control 80%', label: '🔊 Volume 80%' },
  { text: 'format c: /q', label: 'Test Security Block', isBlocked: true },
];

export const CommandBar: React.FC<CommandBarProps> = ({
  onSendMessage,
  onEmergencyStop,
  status,
  isListening,
  onToggleListening,
  language,
  onLanguageChange,
  liveTranscript = '',
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync live microphone transcript directly into input field so user sees what they speak
  useEffect(() => {
    if (liveTranscript) {
      setInputText(liveTranscript);
    }
  }, [liveTranscript]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onEmergencyStop();
    }
  };

  const isBusy = status === 'THINKING' || status === 'EXECUTING';

  return (
    <div id="nova-command-bar" className="w-full max-w-4xl mx-auto space-y-2 shrink-0">
      {/* Dual Options Indicator Header: Type Message & Voice Mic */}
      <div className="flex items-center justify-between px-2 text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 text-blue-300 font-semibold bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-600/40 shadow-sm">
            <span>💬</span>
            <span>MESSAGE (संदेश)</span>
          </span>
          <span className="text-slate-600 font-bold">+</span>
          <span
            onClick={onToggleListening}
            className={`flex items-center space-x-1 cursor-pointer transition-all px-2 py-0.5 rounded-md border ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-black/80 text-blue-400 hover:text-white border-blue-600/40 hover:bg-blue-950/80'
            }`}
          >
            <span>🎙️</span>
            <span>VOICE (बोलें)</span>
          </span>
        </div>

        {/* Quick Language Selector */}
        <div className="flex items-center space-x-1">
          <span className="text-blue-400/80 text-[10px] hidden sm:inline">LANG:</span>
          {(['English', 'Hindi', 'Hinglish'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onLanguageChange(lang)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                language === lang
                  ? 'bg-blue-600 text-white border border-blue-400 font-bold shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-blue-200 bg-black/60 border border-blue-950'
              }`}
            >
              {lang === 'Hindi' ? 'हिंदी (Hindi)' : lang}
            </button>
          ))}
        </div>
      </div>

      {/* Active Listening Voice Banner with Real-time Speech Transcriber */}
      {isListening && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-950/90 via-black to-blue-950/90 border border-blue-500/70 shadow-[0_0_24px_rgba(37,99,235,0.4)] text-xs text-blue-200 font-mono animate-pulse">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="font-bold text-blue-300 shrink-0">NOVA SUN RAHI HAI:</span>
            <span className="text-white font-sans italic truncate">
              {inputText.trim() ? `"${inputText}"` : 'Boliye, main sun rahi hoon... (Listening)'}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            {inputText.trim() && (
              <button
                type="button"
                onClick={handleSubmit}
                className="text-[11px] px-2.5 py-1 rounded bg-blue-500 text-white font-bold hover:bg-blue-400 transition-all shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              >
                SEND NOW ↵
              </button>
            )}
            <button
              type="button"
              onClick={onToggleListening}
              className="text-[11px] px-2 py-1 rounded bg-black/80 border border-red-500/50 text-red-300 hover:bg-red-950 transition-all"
            >
              STOP MIC
            </button>
          </div>
        </div>
      )}

      {/* Main Command & Message Input Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-2xl bg-black/90 border-2 border-blue-600/50 backdrop-blur-2xl shadow-[0_0_25px_rgba(37,99,235,0.2)] focus-within:border-blue-400 focus-within:shadow-[0_0_35px_rgba(37,99,235,0.4)] transition-all p-1.5"
      >
        {/* Microphone Toggle Button (Option 1: Voice) */}
        <button
          type="button"
          onClick={onToggleListening}
          className={`px-3 py-2.5 rounded-xl transition-all font-mono text-xs flex items-center space-x-1.5 shrink-0 ${
            isListening
              ? 'bg-red-600 text-white shadow-[0_0_20px_#ef4444] animate-pulse font-bold'
              : 'bg-blue-950/80 text-blue-200 hover:text-white hover:bg-blue-700/80 border border-blue-500/50 shadow-[0_0_12px_rgba(37,99,235,0.3)]'
          }`}
          title={isListening ? 'Stop listening' : 'Click to Speak (Voice Input)'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-300" />}
          <span className="hidden sm:inline font-semibold">{isListening ? 'Listening...' : 'Voice'}</span>
        </button>

        {/* Text Input field (Option 2: Message) */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Listening to your voice... (बोलिए...)'
              : language === 'Hindi'
              ? 'NOVA को आदेश या संदेश लिखें... जैसे "song play karo" या "calculator open karo"'
              : language === 'Hinglish'
              ? 'Message NOVA... e.g. "Song play karo", "Open calculator", "Web search"'
              : 'Message NOVA... e.g. "Play song", "Open calculator", "Search web"'
          }
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none font-sans"
        />

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5 pr-1 shrink-0">
          {/* Emergency Stop Button */}
          <button
            type="button"
            onClick={onEmergencyStop}
            className={`p-2.5 rounded-xl transition-all font-mono text-xs flex items-center justify-center ${
              isBusy
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] animate-pulse'
                : 'bg-black/90 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800'
            }`}
            title="Emergency Global Stop (Esc)"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={!inputText.trim() && !isBusy}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-400 disabled:opacity-30 disabled:pointer-events-none text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all flex items-center space-x-1.5"
            title="Send Message to NOVA (Enter)"
          >
            <span className="hidden sm:inline text-xs font-mono">SEND</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Quick Suggestions Carousel */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none px-1">
        <span className="font-mono text-[10px] uppercase text-blue-400 shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>QUICK:</span>
        </span>
        {QUICK_SUGGESTIONS.map((sug, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(sug.text)}
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-all border ${
              sug.isBlocked
                ? 'bg-rose-950/60 hover:bg-rose-900 border-rose-500/40 text-rose-300'
                : sug.isConfirm
                ? 'bg-amber-950/60 hover:bg-amber-900 border-amber-500/40 text-amber-300'
                : 'bg-black/80 hover:bg-blue-900/60 border-blue-600/30 text-blue-200 hover:text-white'
            }`}
          >
            {sug.label || sug.text}
          </button>
        ))}
      </div>
    </div>
  );
};
