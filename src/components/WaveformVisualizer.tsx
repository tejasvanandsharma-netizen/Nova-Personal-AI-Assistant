/**
 * Real-time Waveform Animation Component
 * Visualizes audio dynamics during listening, speaking, and standby modes.
 */

import React, { useEffect, useRef } from 'react';
import { VoiceEngine } from '../lib/voiceEngine';

interface WaveformVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  voiceEngine?: VoiceEngine | null;
  status: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isListening,
  isSpeaking,
  voiceEngine,
  status,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 360);
      const height = (canvas.height = 64);
      ctx.clearRect(0, 0, width, height);

      const isActive = isListening || isSpeaking || status === 'EXECUTING';
      const freqData = voiceEngine?.getAudioFrequencyData();

      // Number of bars
      const numBars = 48;
      const barWidth = Math.max(2, (width / numBars) - 2.5);
      const centerY = height / 2;

      phase += isActive ? 0.08 : 0.02;

      // Color scheme based on state
      let primaryColor = '#00f0ff';
      let secondaryColor = '#3b82f6';
      if (isListening) {
        primaryColor = '#22d3ee';
        secondaryColor = '#06b6d4';
      } else if (isSpeaking) {
        primaryColor = '#38bdf8';
        secondaryColor = '#818cf8';
      } else if (status === 'ERROR') {
        primaryColor = '#ef4444';
        secondaryColor = '#f97316';
      }

      for (let i = 0; i < numBars; i++) {
        const norm = i / numBars;
        // Bell-curve envelope to taper edges nicely
        const envelope = Math.sin(norm * Math.PI);

        let amplitude = 4;
        if (freqData && freqData.length > 0) {
          const fIndex = Math.floor((i / numBars) * (freqData.length / 2));
          const val = freqData[fIndex] || 0;
          amplitude = Math.max(4, (val / 255) * (height / 2.2));
        } else if (isActive) {
          // Synthetic procedural harmonic waveform
          const wave1 = Math.sin(phase * 2 + i * 0.45);
          const wave2 = Math.cos(phase * 1.5 + i * 0.25);
          amplitude = Math.max(4, (Math.abs(wave1 * 0.6 + wave2 * 0.4) * (height / 2.2)) * envelope);
        } else {
          // Idle gentle pulse
          amplitude = Math.max(2, (Math.sin(phase + i * 0.2) * 4 + 5) * envelope);
        }

        const x = i * (barWidth + 2.5) + 8;
        const yTop = centerY - amplitude;
        const barHeight = Math.max(3, amplitude * 2);

        // Draw glowing bar
        const gradient = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, secondaryColor);
        gradient.addColorStop(1, primaryColor);

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = isActive ? 8 : 2;

        // Rounded bar
        ctx.beginPath();
        const r = barWidth / 2;
        ctx.roundRect(x, yTop, barWidth, barHeight, r);
        ctx.fill();
        ctx.restore();
      }

      // Center reference baseline filament
      ctx.save();
      ctx.strokeStyle = primaryColor;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isSpeaking, voiceEngine, status]);

  return (
    <div className="w-full flex flex-col items-center justify-center py-2 px-4">
      <div className="w-full max-w-lg h-16 relative flex items-center justify-center rounded-xl bg-slate-950/40 border border-cyan-500/15 backdrop-blur-md px-2 overflow-hidden shadow-inner">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <canvas ref={canvasRef} className="w-full h-full relative z-10" />

        {/* Small sci-fi frequency label */}
        <div className="absolute top-1.5 right-3 font-mono text-[10px] text-cyan-500/60 uppercase tracking-widest pointer-events-none">
          {isListening ? 'AUDIO INPUT ACTIVE' : isSpeaking ? 'VOICE SYNTH 24kHz' : 'AUDIO STANDBY'}
        </div>
      </div>
    </div>
  );
};
