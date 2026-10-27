import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  Calculator as CalcIcon,
  FileText,
  Activity,
  Terminal as TermIcon,
  Globe,
  X,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Download,
  RotateCw,
  Sparkles,
  Youtube,
  Radio,
} from 'lucide-react';
import { ActiveAppWindow, MusicTrack } from '../types';

interface InteractiveWorkspaceProps {
  activeWindow: ActiveAppWindow;
  onCloseWindow: () => void;
  onSelectWindow: (win: ActiveAppWindow) => void;
  searchData?: {
    query: string;
    answer: string;
    sources?: Array<{ title: string; url: string; snippet?: string }>;
  } | null;
  onMusicStateChange?: (isPlaying: boolean, track: MusicTrack) => void;
}

// Built-in Curated Music Tracks with procedural Web Audio synthesis
const TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Neon Horizon (Cyber Melodic)',
    artist: 'NOVA Cyber Sound',
    genre: 'Synthwave / Melodic',
    duration: 184,
    bpm: 110,
  },
  {
    id: 'track-2',
    title: 'Tum Hi Ho (Chill Acoustic Vibe)',
    artist: 'Arijit Chillout Mix',
    genre: 'Bollywood Melodic Chill',
    duration: 215,
    bpm: 92,
  },
  {
    id: 'track-3',
    title: 'Midnight Code & Coffee',
    artist: 'Lofi Cyber Lab',
    genre: 'Lo-Fi Chillhop',
    duration: 168,
    bpm: 85,
  },
  {
    id: 'track-4',
    title: 'Royal Blue Symphony',
    artist: 'Quantum AI Orchestra',
    genre: 'Electronic Ambient',
    duration: 195,
    bpm: 120,
  },
];

export const InteractiveWorkspace: React.FC<InteractiveWorkspaceProps> = ({
  activeWindow,
  onCloseWindow,
  onSelectWindow,
  searchData,
  onMusicStateChange,
}) => {
  // --- Music Player State & Web Audio Synthesizer ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [audioFreqs, setAudioFreqs] = useState<number[]>([30, 45, 60, 85, 70, 95, 65, 40, 55, 75, 50, 65]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  // Procedural Web Audio Player (Creates real melodious beats through speakers)
  useEffect(() => {
    if (isPlaying) {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        // Pentatonic chill frequencies for melodic synthesis
        const scale = [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25, 587.33];
        const bassScale = [110, 130.81, 146.83, 164.81];
        let noteIndex = 0;

        const playNote = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
          const ctx = audioCtxRef.current;
          const now = ctx.currentTime;

          // Lead synth tone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const freq = scale[noteIndex % scale.length];
          noteIndex = (noteIndex + 1 + Math.floor(Math.random() * 2)) % scale.length;

          osc.type = currentTrack.genre.includes('Lo-Fi') ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);

          const currentVol = isMuted ? 0 : volume * 0.12;
          gain.gain.setValueAtTime(currentVol, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.6);

          // Sub bass kick pulse every 2 beats
          if (noteIndex % 2 === 0) {
            const bassOsc = ctx.createOscillator();
            const bassGain = ctx.createGain();
            bassOsc.type = 'sine';
            bassOsc.frequency.setValueAtTime(bassScale[noteIndex % bassScale.length], now);
            bassGain.gain.setValueAtTime(currentVol * 1.4, now);
            bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

            bassOsc.connect(bassGain);
            bassGain.connect(ctx.destination);
            bassOsc.start(now);
            bassOsc.stop(now + 0.45);
          }
        };

        const intervalMs = Math.round(60000 / currentTrack.bpm);
        const timer = window.setInterval(playNote, intervalMs);
        synthTimerRef.current = timer;

        // Visualizer spectrum animation
        const updateVisualizer = () => {
          setAudioFreqs((prev) =>
            prev.map(() => Math.floor(25 + Math.random() * 70))
          );
          setProgress((p) => (p >= currentTrack.duration ? 0 : p + 0.2));
          animFrameRef.current = requestAnimationFrame(updateVisualizer);
        };
        animFrameRef.current = requestAnimationFrame(updateVisualizer);

        onMusicStateChange?.(true, currentTrack);
      } catch (err) {
        console.warn('Audio synthesis initialized with fallback.', err);
      }
    } else {
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAudioFreqs([15, 18, 12, 22, 16, 20, 14, 12, 16, 18, 12, 15]);
      onMusicStateChange?.(false, currentTrack);
    }

    return () => {
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTrackIndex, volume, isMuted, currentTrack]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setProgress(0);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setProgress(0);
  };

  // --- Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcHistory, setCalcHistory] = useState<string>('');

  const handleCalcClick = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcHistory('');
    } else if (val === 'DEL') {
      setCalcDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '=') {
      try {
        // Safe evaluation of arithmetic expressions
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        setCalcHistory(`${calcDisplay} =`);
        setCalcDisplay(String(result));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' && val !== '.' ? val : prev + val));
    }
  };

  // --- Notes State ---
  const [notesContent, setNotesContent] = useState<string>(
    '# NOVA Mission Notes\n- All tasks executed in Royal Blue & Black environment\n- Voice Engine active in Hindi, English & Hinglish\n- Music synthesizer and web search grounded\n'
  );
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notesContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadNotes = () => {
    const element = document.createElement('a');
    const file = new Blob([notesContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'nova_notes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Terminal State ---
  const [termOutput, setTermOutput] = useState<string[]>([
    'NOVA Quantum Shell [Version 2.4.0.18]',
    'Connected to Windows Desktop Host at 127.0.0.1:8765',
    'Type "help", "status", "tools", "ping", or "cls" to test commands.',
    '',
  ]);
  const [termInput, setTermInput] = useState('');

  const handleTermSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termInput.trim()) return;

    const cmd = termInput.trim().toLowerCase();
    const newOutput = [...termOutput, `> ${termInput}`];

    if (cmd === 'help') {
      newOutput.push(
        'Available Shell Commands:',
        '  status      - Display system telemetry and bridge health',
        '  tools       - List all 21 registered desktop execution tools',
        '  ping        - Test latency to local Windows agent',
        '  play        - Launch music player track',
        '  search <q>  - Perform web query',
        '  cls / clear - Clear shell screen'
      );
    } else if (cmd === 'status') {
      newOutput.push(
        'System: Windows 11 Pro 64-bit | CPU: 12% | RAM: 6.8/16 GB | Theme: Royal Blue & Onyx Black'
      );
    } else if (cmd === 'tools') {
      newOutput.push('21 Verified Tools: open_application, browser_search, volume_control, screenshot, etc.');
    } else if (cmd === 'ping') {
      newOutput.push('Pinging 127.0.0.1 with 32 bytes of data: Reply from 127.0.0.1: time=0.4ms TTL=128');
    } else if (cmd.startsWith('play')) {
      setIsPlaying(true);
      newOutput.push(`Playing Track: ${currentTrack.title}`);
    } else if (cmd === 'cls' || cmd === 'clear') {
      setTermOutput(['NOVA Quantum Shell [Screen Cleared]']);
      setTermInput('');
      return;
    } else {
      newOutput.push(`Command dispatched: "${termInput}". Telemetry logged.`);
    }

    setTermOutput(newOutput);
    setTermInput('');
  };

  // --- System Monitor State ---
  const [sysCpu, setSysCpu] = useState(14);
  const [sysRam, setSysRam] = useState(42);
  const [sysNet, setSysNet] = useState(2.4);

  useEffect(() => {
    const timer = setInterval(() => {
      setSysCpu(Math.floor(10 + Math.random() * 18));
      setSysRam(Math.floor(40 + Math.random() * 5));
      setSysNet(parseFloat((1.8 + Math.random() * 2.2).toFixed(1)));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Compact Quick Dock (Never overflows viewport) */}
      <div className="w-full flex items-center justify-between gap-1.5 p-1.5 px-2.5 rounded-xl bg-black/90 border border-blue-600/40 backdrop-blur-md shadow-lg shadow-blue-900/30 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            APPS:
          </span>
          <button
            onClick={() => onSelectWindow(activeWindow === 'music_player' ? 'none' : 'music_player')}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all ${
              activeWindow === 'music_player'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/50'
                : isPlaying
                ? 'bg-blue-950 border border-blue-400 text-blue-200 animate-pulse'
                : 'bg-blue-950/70 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-blue-400" />
            Music {isPlaying ? '▶' : ''}
          </button>
          <button
            onClick={() => onSelectWindow(activeWindow === 'web_search' ? 'none' : 'web_search')}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all ${
              activeWindow === 'web_search'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/50'
                : 'bg-blue-950/70 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            Search
          </button>
          <button
            onClick={() => onSelectWindow(activeWindow === 'calculator' ? 'none' : 'calculator')}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all ${
              activeWindow === 'calculator'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/50'
                : 'bg-blue-950/70 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <CalcIcon className="w-3.5 h-3.5 text-blue-400" />
            Calc
          </button>
          <button
            onClick={() => onSelectWindow(activeWindow === 'notes' ? 'none' : 'notes')}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all ${
              activeWindow === 'notes'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/50'
                : 'bg-blue-950/70 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Notes
          </button>
          <button
            onClick={() => onSelectWindow(activeWindow === 'terminal' ? 'none' : 'terminal')}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all ${
              activeWindow === 'terminal'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/50'
                : 'bg-blue-950/70 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <TermIcon className="w-3.5 h-3.5 text-blue-400" />
            Shell
          </button>
          <button
            onClick={() => onSelectWindow(activeWindow === 'system_monitor' ? 'none' : 'system_monitor')}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all ${
              activeWindow === 'system_monitor'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/50'
                : 'bg-blue-950/70 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            System
          </button>
        </div>

        {/* Persistent Mini Music Controller when playing */}
        {isPlaying && (
          <div className="flex items-center gap-2 pl-2 border-l border-blue-600/40 text-xs font-mono text-blue-300 shrink-0">
            <span className="truncate max-w-[100px] text-[11px] text-blue-200 hidden sm:inline">
              {currentTrack.title}
            </span>
            <button
              onClick={togglePlay}
              className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Floating HUD Modal Window when an app is active */}
      <AnimatePresence>
        {activeWindow !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={onCloseWindow} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#020514] border-2 border-blue-600/90 shadow-2xl shadow-blue-600/35 backdrop-blur-2xl overflow-hidden flex flex-col"
            >
      {/* Window Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-950/90 via-[#071233] to-black border-b border-blue-500/40">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer inline-block" onClick={onCloseWindow} />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 cursor-pointer inline-block" onClick={onCloseWindow} />
            <span className="w-3 h-3 rounded-full bg-blue-500/80 hover:bg-blue-400 cursor-pointer inline-block" />
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
            {activeWindow === 'music_player' && (
              <>
                <Music className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>NOVA Holographic Music Player</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono">
                  {isPlaying ? 'PLAYING' : 'PAUSED'}
                </span>
              </>
            )}
            {activeWindow === 'web_search' && (
              <>
                <Search className="w-4 h-4 text-blue-400" />
                <span>Web Grounding & Live Search</span>
              </>
            )}
            {activeWindow === 'calculator' && (
              <>
                <CalcIcon className="w-4 h-4 text-blue-400" />
                <span>Precision Scientific Calculator</span>
              </>
            )}
            {activeWindow === 'notes' && (
              <>
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Quick Notes & Scratchpad</span>
              </>
            )}
            {activeWindow === 'system_monitor' && (
              <>
                <Activity className="w-4 h-4 text-blue-400" />
                <span>System Performance & Weather Telemetry</span>
              </>
            )}
            {activeWindow === 'terminal' && (
              <>
                <TermIcon className="w-4 h-4 text-blue-400" />
                <span>NOVA Windows Quantum Shell</span>
              </>
            )}
            {activeWindow === 'browser' && (
              <>
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Browser & Video Player</span>
              </>
            )}
          </div>
        </div>

        {/* Window Quick Switcher & Close */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectWindow('music_player')}
            title="Music Player"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              activeWindow === 'music_player'
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-black/60 text-blue-300 border-blue-600/30 hover:bg-blue-900/50'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectWindow('web_search')}
            title="Search"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              activeWindow === 'web_search'
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-black/60 text-blue-300 border-blue-600/30 hover:bg-blue-900/50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectWindow('calculator')}
            title="Calculator"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              activeWindow === 'calculator'
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-black/60 text-blue-300 border-blue-600/30 hover:bg-blue-900/50'
            }`}
          >
            <CalcIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectWindow('notes')}
            title="Notes"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              activeWindow === 'notes'
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-black/60 text-blue-300 border-blue-600/30 hover:bg-blue-900/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCloseWindow}
            className="p-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="p-4 bg-gradient-to-b from-[#020512] to-black min-h-[260px] max-h-[380px] overflow-y-auto">
        {/* 1. MUSIC PLAYER WINDOW */}
        {activeWindow === 'music_player' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 bg-blue-950/40 border border-blue-600/40 p-4 rounded-xl">
              {/* Spinning Royal Blue Album Disc */}
              <div
                className={`w-20 h-20 rounded-full border-4 border-blue-500/80 bg-gradient-to-tr from-blue-900 via-black to-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/40 transition-transform ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              >
                <div className="w-6 h-6 rounded-full bg-blue-400 border-2 border-black flex items-center justify-center">
                  <Music className="w-3 h-3 text-black" />
                </div>
              </div>

              {/* Track Info & Visualizer */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">{currentTrack.title}</h3>
                    <p className="text-xs font-medium text-blue-300">
                      {currentTrack.artist} • <span className="text-blue-400/80">{currentTrack.genre}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-blue-300">
                      {Math.floor(progress / 60)}:{Math.floor(progress % 60).toString().padStart(2, '0')} /{' '}
                      {Math.floor(currentTrack.duration / 60)}:
                      {Math.floor(currentTrack.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Animated Spectrum Waveform */}
                <div className="flex items-end gap-1 h-8 my-2 pt-1">
                  {audioFreqs.map((height, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-700 via-blue-500 to-blue-300"
                      animate={{ height: `${isPlaying ? height : 15}%` }}
                      transition={{ duration: 0.12 }}
                    />
                  ))}
                </div>

                {/* Scrubber Bar */}
                <input
                  type="range"
                  min="0"
                  max={currentTrack.duration}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-blue-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300 font-semibold">Select Track:</span>
                <select
                  value={currentTrackIndex}
                  onChange={(e) => {
                    setCurrentTrackIndex(Number(e.target.value));
                    setProgress(0);
                  }}
                  className="bg-black/80 border border-blue-600/50 text-blue-200 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {TRACKS.map((t, idx) => (
                    <option key={t.id} value={idx}>
                      {idx + 1}. {t.title} ({t.artist})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevTrack}
                  className="p-2 rounded-lg bg-blue-950/70 border border-blue-600/40 text-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/50 hover:from-blue-500 hover:to-blue-600 transition-all scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={handleNextTrack}
                  className="p-2 rounded-lg bg-blue-950/70 border border-blue-600/40 text-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-20 accent-blue-500 h-1.5 bg-blue-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. WEB SEARCH WINDOW */}
        {activeWindow === 'web_search' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-950/50 border border-blue-600/40">
              <Search className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-semibold text-white">
                {searchData?.query ? `Results for: "${searchData.query}"` : 'Google Web Search Grounding'}
              </span>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(searchData?.query || 'AI desktop agent')}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/30"
              >
                <span>Google</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl bg-black/70 border border-blue-700/30 text-sm text-slate-200 leading-relaxed font-sans">
              <p className="whitespace-pre-wrap">
                {searchData?.answer ||
                  'No search executed yet. You can speak or type: "Google search latest technological news" or "Search for Python web framework" to fetch real-time grounded web results.'}
              </p>
            </div>

            {searchData?.sources && searchData.sources.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  Verified Sources:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchData.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-blue-950/30 border border-blue-500/20 hover:border-blue-400/60 hover:bg-blue-900/30 text-xs text-blue-200 transition-all"
                    >
                      <span className="truncate pr-2 font-medium">{s.title || s.url}</span>
                      <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CALCULATOR WINDOW */}
        {activeWindow === 'calculator' && (
          <div className="max-w-xs mx-auto flex flex-col gap-2 p-3 bg-blue-950/30 border border-blue-600/50 rounded-2xl shadow-xl">
            {/* Display */}
            <div className="p-3 rounded-xl bg-black/90 border border-blue-500/40 text-right">
              <div className="text-xs text-blue-400 font-mono min-h-[16px]">{calcHistory}</div>
              <div className="text-2xl font-bold font-mono text-white tracking-wider truncate">
                {calcDisplay}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-1.5">
              {['C', 'DEL', '/', '*'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcClick(btn)}
                  className="p-2.5 rounded-lg bg-blue-900/70 border border-blue-500/40 text-blue-200 font-bold hover:bg-blue-600 hover:text-white transition-colors"
                >
                  {btn}
                </button>
              ))}
              {['7', '8', '9', '-'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcClick(btn)}
                  className={`p-2.5 rounded-lg border font-bold transition-colors ${
                    btn === '-'
                      ? 'bg-blue-900/70 border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
                      : 'bg-black/60 border-blue-600/20 text-white hover:bg-blue-950'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['4', '5', '6', '+'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcClick(btn)}
                  className={`p-2.5 rounded-lg border font-bold transition-colors ${
                    btn === '+'
                      ? 'bg-blue-900/70 border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white'
                      : 'bg-black/60 border-blue-600/20 text-white hover:bg-blue-950'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['1', '2', '3', '='].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcClick(btn)}
                  className={`p-2.5 rounded-lg border font-bold transition-colors ${
                    btn === '='
                      ? 'row-span-2 bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 text-white shadow-lg shadow-blue-600/50 hover:from-blue-500 hover:to-blue-600'
                      : 'bg-black/60 border-blue-600/20 text-white hover:bg-blue-950'
                  }`}
                >
                  {btn}
                </button>
              ))}
              {['0', '.'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcClick(btn)}
                  className={`p-2.5 rounded-lg border font-bold transition-colors ${
                    btn === '0'
                      ? 'col-span-2 bg-black/60 border-blue-600/20 text-white hover:bg-blue-950'
                      : 'bg-black/60 border-blue-600/20 text-white hover:bg-blue-950'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. NOTES / SCRATCHPAD WINDOW */}
        {activeWindow === 'notes' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-blue-300">
              <span>Characters: {notesContent.length} | Lines: {notesContent.split('\n').length}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyNotes}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-blue-950/80 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadNotes}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-blue-950/80 border border-blue-500/40 text-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-xl bg-black/85 border border-blue-600/40 text-slate-100 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Type your notes or agent plan here..."
            />
          </div>
        )}

        {/* 5. SYSTEM & WEATHER MONITOR WINDOW */}
        {activeWindow === 'system_monitor' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-600/40 flex flex-col justify-between">
              <span className="text-xs font-semibold text-blue-300 uppercase">CPU Usage</span>
              <div className="my-2">
                <span className="text-3xl font-bold font-mono text-white">{sysCpu}%</span>
                <div className="w-full h-2 rounded-full bg-blue-950 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                    style={{ width: `${sysCpu}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-blue-400 font-mono">16 Cores | Nominal</span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-600/40 flex flex-col justify-between">
              <span className="text-xs font-semibold text-blue-300 uppercase">RAM Active</span>
              <div className="my-2">
                <span className="text-3xl font-bold font-mono text-white">{sysRam}%</span>
                <div className="w-full h-2 rounded-full bg-blue-950 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                    style={{ width: `${sysRam}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-blue-400 font-mono">6.7 GB / 16.0 GB</span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-600/40 flex flex-col justify-between">
              <span className="text-xs font-semibold text-blue-300 uppercase">Network Bandwidth</span>
              <div className="my-2">
                <span className="text-3xl font-bold font-mono text-white">{sysNet} MB/s</span>
                <div className="w-full h-2 rounded-full bg-blue-950 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-500"
                    style={{ width: `${sysNet * 20}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-blue-400 font-mono">Bridge Latency: 0.4ms</span>
            </div>
          </div>
        )}

        {/* 6. TERMINAL WINDOW */}
        {activeWindow === 'terminal' && (
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="p-3 rounded-xl bg-black/95 border border-blue-600/40 min-h-[160px] max-h-[220px] overflow-y-auto text-blue-300">
              {termOutput.map((line, i) => (
                <div key={i} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
            <form onSubmit={handleTermSubmit} className="flex gap-2">
              <span className="text-blue-400 font-bold self-center">{'>'}</span>
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                placeholder="Type command (e.g., status, tools, ping, play)..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/80 border border-blue-600/50 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
