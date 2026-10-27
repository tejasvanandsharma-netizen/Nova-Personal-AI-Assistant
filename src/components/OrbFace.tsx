/**
 * NOVA Central Animated AI Orb / Face
 *
 * Highly responsive futuristic AI core that transforms based on agent state:
 * IDLE: Calm, hypnotic pulsating cyber rings & gentle energy breathing
 * LISTENING: Expanding sonic rings, rapid audio frequency waves
 * THINKING: Multi-axis rotating quantum orbital glyphs & prismatic core
 * EXECUTING: Kinetic electric cyan surges & energetic power pulses
 * COMPLETED: Harmonious emerald/cyan expanding glow
 * ERROR: Crimson alert shields & warning diagnostic pulse
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AgentStatus } from '../types';

interface OrbFaceProps {
  status: AgentStatus;
  isSpeaking: boolean;
  isListening: boolean;
  onClick?: () => void;
}

export const OrbFace: React.FC<OrbFaceProps> = ({
  status,
  isSpeaking,
  isListening,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Status-based color themes
  const getTheme = () => {
    switch (status) {
      case 'LISTENING':
        return {
          core: '#00f0ff',
          glow: 'rgba(0, 240, 255, 0.45)',
          ring: '#00d8f6',
          label: 'LISTENING',
          pulseSpeed: 1.2,
        };
      case 'THINKING':
        return {
          core: '#8b5cf6',
          glow: 'rgba(139, 92, 246, 0.5)',
          ring: '#a78bfa',
          label: 'THINKING',
          pulseSpeed: 0.8,
        };
      case 'EXECUTING':
        return {
          core: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.55)',
          ring: '#0ea5e9',
          label: 'EXECUTING',
          pulseSpeed: 0.6,
        };
      case 'COMPLETED':
        return {
          core: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)',
          ring: '#34d399',
          label: 'COMPLETED',
          pulseSpeed: 2.0,
        };
      case 'ERROR':
        return {
          core: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.5)',
          ring: '#f87171',
          label: 'SECURITY ALERT',
          pulseSpeed: 0.5,
        };
      case 'IDLE':
      default:
        return {
          core: isSpeaking ? '#38bdf8' : '#06b6d4',
          glow: isSpeaking ? 'rgba(56, 189, 248, 0.4)' : 'rgba(6, 182, 212, 0.3)',
          ring: '#22d3ee',
          label: isSpeaking ? 'SPEAKING' : 'STANDBY',
          pulseSpeed: isSpeaking ? 0.9 : 2.5,
        };
    }
  };

  const theme = getTheme();

  // Particle Canvas Background for the Orb
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = 280);
    let height = (canvas.height = 280);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      speed: number;
      dist: number;
      alpha: number;
    }> = [];

    const count = 36;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        radius: Math.random() * 1.8 + 0.6,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.015 + 0.005) * (i % 2 === 0 ? 1 : -1),
        dist: 45 + Math.random() * 75,
        alpha: Math.random() * 0.7 + 0.2,
      });
    }

    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      time += 0.02;

      // Draw subtle orbital guide tracks
      ctx.save();
      ctx.strokeStyle = theme.ring;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Render orbiting cyber particles
      particles.forEach((p, idx) => {
        p.angle += p.speed * (status === 'THINKING' ? 2.5 : status === 'EXECUTING' ? 3.0 : 1);
        const wobble = Math.sin(time * 2 + idx) * 4;
        const currentDist = p.dist + wobble;
        const px = cx + Math.cos(p.angle) * currentDist;
        const py = cy + Math.sin(p.angle) * currentDist;

        ctx.save();
        ctx.fillStyle = theme.core;
        ctx.globalAlpha = p.alpha * (isListening || isSpeaking ? 0.9 : 0.6);
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles with subtle light filaments
        if (idx % 3 === 0) {
          const next = particles[(idx + 1) % count];
          const nx = cx + Math.cos(next.angle) * next.dist;
          const ny = cy + Math.sin(next.angle) * next.dist;
          const d = Math.hypot(px - nx, py - ny);
          if (d < 40) {
            ctx.strokeStyle = theme.core;
            ctx.globalAlpha = (1 - d / 40) * 0.25;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, isSpeaking, isListening, theme.core, theme.ring]);

  return (
    <div
      id="nova-orb-container"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group"
    >
      {/* Outer ambient energy halo */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none transition-all duration-700 blur-3xl opacity-40"
        style={{
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Particle Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute w-[280px] h-[280px] pointer-events-none z-0"
      />

      {/* Rotating outer sci-fi gyro ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        className="absolute w-56 h-56 rounded-full border border-dashed border-cyan-500/25 pointer-events-none"
        style={{
          borderColor: `${theme.ring}35`,
        }}
      />

      {/* Counter-rotating segmented HUD ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        className="absolute w-44 h-44 rounded-full border-2 border-t-transparent border-b-transparent border-l-cyan-400/40 border-r-cyan-400/40 pointer-events-none"
        style={{
          borderLeftColor: `${theme.ring}60`,
          borderRightColor: `${theme.ring}60`,
        }}
      />

      {/* Pulsing Core Sphere */}
      <motion.div
        animate={{
          scale: isSpeaking
            ? [1, 1.15, 0.98, 1.12, 1]
            : isListening
            ? [1, 1.12, 1.02, 1.14, 1]
            : [1, 1.05, 1],
        }}
        transition={{
          duration: theme.pulseSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${theme.core} 45%, #050b16 95%)`,
          boxShadow: `0 0 45px ${theme.glow}, inset 0 0 25px rgba(255,255,255,0.6)`,
        }}
      >
        {/* Core pupil / iris animated pattern */}
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border border-white/30 backdrop-blur-sm bg-black/20">
          <motion.div
            animate={{
              rotate: [0, 180, 360],
              scale: status === 'THINKING' ? [0.8, 1.2, 0.8] : [0.95, 1.05, 0.95],
            }}
            transition={{
              duration: status === 'THINKING' ? 3 : 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-cyan-200/50"
            style={{
              borderColor: `${theme.ring}90`,
            }}
          >
            {/* Center diamond eye */}
            <div
              className="w-3.5 h-3.5 rotate-45 transition-colors duration-300 shadow-md"
              style={{
                backgroundColor: theme.core,
                boxShadow: `0 0 12px ${theme.core}`,
              }}
            />
          </motion.div>

          {/* Scanning line sweep through pupil */}
          <motion.div
            animate={{ y: [-32, 32] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-full h-[2px] bg-white/60 blur-[1px] pointer-events-none"
          />
        </div>
      </motion.div>

      {/* Cybernetic status indicator text badge */}
      <div className="relative z-10 mt-6 flex items-center space-x-2 px-3.5 py-1 rounded-full border bg-slate-950/80 backdrop-blur-md shadow-lg transition-colors duration-500"
        style={{
          borderColor: `${theme.ring}40`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: theme.core }}
        />
        <span className="font-mono text-xs tracking-widest font-semibold text-slate-200 uppercase">
          NOVA // {theme.label}
        </span>
      </div>
    </div>
  );
};
