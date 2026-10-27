/**
 * NOVA Compact Floating Chat & Unified Input Panel
 * Styled in Royal Blue & Onyx Black.
 * Features unified text typing, voice microphone trigger, language switcher,
 * and conversational response stream without cluttering the screen.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSpeakMessage: (text: string) => void;
  isSpeaking: boolean;
  onSendMessage: (text: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
  language: 'English' | 'Hindi' | 'Hinglish';
  onLanguageChange: (lang: 'English' | 'Hindi' | 'Hinglish') => void;
  liveTranscript?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSpeakMessage,
  isSpeaking,
  onSendMessage,
  isListening = false,
  onToggleListening,
  language = 'Hinglish',
  onLanguageChange,
  liveTranscript = '',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [inputText, setInputText] = useState('');

  // Sync live voice transcript into input box
  useEffect(() => {
    if (liveTranscript) {
      setInputText(liveTranscript);
    }
  }, [liveTranscript]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When collapsed, render an ultra-sleek floating trigger button
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/90 border border-blue-500/50 text-blue-200 hover:text-white hover:border-blue-400 shadow-xl shadow-blue-900/30 backdrop-blur-xl transition-all font-mono text-xs"
          title="Open Chat Stream"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
          <span className="font-semibold">MESSAGES ({messages.length})</span>
          <ChevronRight className="w-4 h-4 text-blue-400" />
        </button>

        {/* Quick Voice Mic Trigger Even When Collapsed */}
        <button
          onClick={onToggleListening}
          className={`p-3 rounded-2xl border transition-all shadow-xl backdrop-blur-xl ${
            isListening
              ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_18px_#f43f5e] animate-pulse'
              : 'bg-black/90 border-blue-600/50 text-blue-300 hover:bg-blue-950 hover:text-white'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice command'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-blue-400" />}
        </button>
      </div>
    );
  }

  return (
    <div
      id="nova-chat-panel"
      className="flex flex-col h-full rounded-2xl bg-black/90 border border-blue-600/50 backdrop-blur-2xl shadow-2xl shadow-blue-950/70 overflow-hidden relative"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-blue-600/30 bg-gradient-to-r from-blue-950/90 via-black to-blue-950/90 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
          <h2 className="font-mono text-xs uppercase tracking-wider text-blue-200 font-semibold">
            NOVA COMM
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-300">
            {messages.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Selector */}
          <div className="flex items-center rounded-lg bg-black/80 border border-blue-600/40 p-0.5 text-[10px] font-mono">
            {(['Hinglish', 'Hindi', 'English'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  language === lang
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-blue-200'
                }`}
              >
                {lang === 'Hinglish' ? 'HING' : lang === 'Hindi' ? 'HIN' : 'ENG'}
              </button>
            ))}
          </div>

          {/* Minimize / Collapse Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg hover:bg-blue-900/50 text-slate-400 hover:text-blue-200 transition-colors"
              title="Minimize panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-blue-600/30 scrollbar-track-transparent min-h-0"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Meta header */}
                <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 mb-0.5 px-1">
                  {isUser ? (
                    <>
                      <span>{msg.timestamp}</span>
                      <span className="text-blue-400 font-semibold">YOU</span>
                      <User className="w-3 h-3 text-blue-400" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300 font-semibold">NOVA</span>
                      <span>{msg.timestamp}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[92%] rounded-xl p-2.5 text-xs leading-relaxed transition-all shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-tr-none shadow-blue-700/20 font-medium'
                      : 'bg-[#04081c] border border-blue-600/50 text-blue-100 rounded-tl-none shadow-black/80'
                  }`}
                >
                  <p className="whitespace-pre-wrap selection:bg-blue-500/30 font-sans">
                    {msg.content}
                  </p>

                  {/* Audio speak trigger for assistant messages */}
                  {!isUser && (
                    <div className="mt-1.5 pt-1.5 border-t border-blue-500/20 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onSpeakMessage(msg.content)}
                        className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-500/30 text-[10px] text-blue-300 hover:text-white hover:bg-blue-600 transition-colors font-mono"
                        title="Play message with speech synthesis"
                      >
                        {isSpeaking ? (
                          <VolumeX className="w-3.5 h-3.5 animate-pulse text-rose-300" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{isSpeaking ? 'STOP SPEECH' : '🔊 SPEAK OUT'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* UNIFIED INPUT SECTION: Voice Mic + Text Input + Send (The Single Point of Input) */}
      <div className="p-2.5 border-t border-blue-600/40 bg-black/95 backdrop-blur-xl space-y-1.5 shrink-0">
        {/* Live Mic Listening Badge */}
        {isListening && (
          <div className="flex items-center justify-between text-[11px] font-mono text-rose-300 px-2.5 py-1.5 rounded-lg bg-rose-950/90 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold text-rose-200">
                {inputText ? `"${inputText}"` : 'Listening (Continuous Mode Online)...'}
              </span>
            </div>
            <button
              onClick={onToggleListening}
              className="text-[10px] text-rose-300 hover:text-white bg-rose-900/60 hover:bg-rose-800 px-2 py-0.5 rounded transition-all font-bold"
            >
              MUTE
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-1.5">
          {/* Single Voice Mic Trigger */}
          <button
            type="button"
            onClick={onToggleListening}
            className={`p-2 rounded-xl transition-all border shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_#f43f5e] animate-pulse'
                : 'bg-blue-950/80 border-blue-600/60 text-blue-300 hover:bg-blue-900/80 hover:text-white'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice command'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or speak a task..."
            className="flex-1 bg-black/90 border border-blue-600/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400 shadow-inner"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-40 text-white transition-all shadow-md shadow-blue-600/40 shrink-0"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Task Shortcuts for 1-Click Launching */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 no-scrollbar text-[10px]">
          <button
            type="button"
            onClick={() => onSendMessage('Play song')}
            className="px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
          >
            🎵 Play Song
          </button>
          <button
            type="button"
            onClick={() => onSendMessage('Open calculator')}
            className="px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
          >
            🧮 Calculator
          </button>
          <button
            type="button"
            onClick={() => onSendMessage('Google search latest tech')}
            className="px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
          >
            🔍 Search Web
          </button>
          <button
            type="button"
            onClick={() => onSendMessage('Open whatsapp')}
            className="px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
          >
            💬 WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
