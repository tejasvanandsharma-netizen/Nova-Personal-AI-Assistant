/**
 * Server-side Memory Store for NOVA
 * Persists user preferences, assistant preferences, summaries, apps, and custom commands.
 */

import fs from 'fs';
import path from 'path';
import { MemoryData } from '../types';

const MEMORY_FILE_PATH = path.join(process.cwd(), 'data', 'nova_memory.json');

const DEFAULT_MEMORY: MemoryData = {
  userPreferences: {
    name: 'Commander',
    preferredLanguage: 'auto',
    voiceEnabled: true,
    voiceRate: 1.0,
    voicePitch: 1.0,
    autoSpeak: true,
    theme: 'cyber-dark',
  },
  assistantPreferences: {
    tone: 'calm-futuristic',
    brevity: 'balanced',
    confirmAllDeletions: true,
    strictSafetyAudit: true,
  },
  conversationSummaries: [
    'User configured NOVA desktop bridge on port 8765.',
    'System telemetry and security audit profiles verified.',
  ],
  frequentlyUsedApps: [
    { name: 'Visual Studio Code', path: 'code.exe', launches: 28, category: 'Development' },
    { name: 'Google Chrome', path: 'chrome.exe', launches: 45, category: 'Browser' },
    { name: 'Spotify', path: 'spotify.exe', launches: 19, category: 'Media' },
    { name: 'Windows Terminal', path: 'wt.exe', launches: 34, category: 'System' },
    { name: 'Notepad', path: 'notepad.exe', launches: 12, category: 'Productivity' },
  ],
  customCommands: [
    {
      id: 'cmd-dev-mode',
      trigger: 'activate dev mode',
      description: 'Launches VS Code and opens project terminal',
      actionTools: ['open_application'],
      templatePrompt: 'Open VS Code and open terminal in my projects directory',
    },
    {
      id: 'cmd-focus-mode',
      trigger: 'focus mode',
      description: 'Mutes volume, closes browser distractions, and plays ambient music',
      actionTools: ['volume_control', 'play_media'],
      templatePrompt: 'Set volume to 30% and play lofi focus playlist',
    },
    {
      id: 'cmd-sys-check',
      trigger: 'system diagnosis',
      description: 'Runs complete hardware telemetry inspection',
      actionTools: ['system_information', 'read_screen'],
      templatePrompt: 'Check system information and screen context',
    },
  ],
  lastUpdated: new Date().toISOString(),
};

let inMemoryCache: MemoryData = { ...DEFAULT_MEMORY };

export function loadMemory(): MemoryData {
  try {
    if (fs.existsSync(MEMORY_FILE_PATH)) {
      const raw = fs.readFileSync(MEMORY_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      inMemoryCache = { ...DEFAULT_MEMORY, ...parsed };
      return inMemoryCache;
    }
  } catch (err) {
    console.warn('[NOVA Memory] Could not read memory file, using cache:', err);
  }
  return inMemoryCache;
}

export function saveMemory(updates: Partial<MemoryData>): MemoryData {
  try {
    const dir = path.dirname(MEMORY_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    inMemoryCache = {
      ...inMemoryCache,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(inMemoryCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[NOVA Memory] Could not persist memory to disk, updated cache only:', err);
    inMemoryCache = {
      ...inMemoryCache,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
  }
  return inMemoryCache;
}
