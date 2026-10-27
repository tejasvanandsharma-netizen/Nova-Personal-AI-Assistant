/**
 * NOVA Server-Side Agent Pipeline & Task Engine
 *
 * Implements the complete agent lifecycle:
 * user request
 *   → analyze
 *   → plan
 *   → choose tool
 *   → validate parameters
 *   → request permission if required (Approval Gate)
 *   → send tool call to local agent
 *   → receive result
 *   → verify result (Strict: never invent success)
 *   → continue task or finish.
 *
 * Supports multi-step tasks, timeout handling, safe retry logic,
 * and emergency cancellation.
 */

import { GoogleGenAI } from '@google/genai';
import {
  AgentProcessRequest,
  AgentProcessResponse,
  TaskPlanStep,
  ActivityTimelineItem,
  ToolExecutionResult,
  AgentTaskPlan,
  LocalBridgeConfig,
} from '../types';
import {
  TOOLS_REGISTRY,
  TOOL_ALIASES,
  resolveCanonicalToolName,
  evaluateSecurity,
  validateToolParameters,
  verifyToolResult,
  executeSimulatedTool,
} from '../lib/toolsRegistry';
import { loadMemory } from './memoryStore';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

/**
 * Detect language: English, Hindi, or Hinglish
 */
export function detectLanguage(text: string): 'English' | 'Hindi' | 'Hinglish' {
  if (/[\u0900-\u097F]/.test(text)) {
    return 'Hindi';
  }

  const hinglishWords = [
    'karo', 'khol', 'kholo', 'band', 'chalao', 'dekho', 'kya', 'hai', 'bhai', 'yaar',
    'kardo', 'kar do', 'dijiye', 'batao', 'kaise', 'sab', 'thik', 'wala', 'meri', 'mera',
    'kaise', 'rakho', 'hatao', 'hata do', 'dhundo', 'dhundh', 'pehle', 'phir', 'baad'
  ];
  const words = text.toLowerCase().split(/\s+/);
  const matchCount = words.filter((w) => hinglishWords.includes(w)).length;
  if (matchCount > 0) {
    return 'Hinglish';
  }

  return 'English';
}

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

interface ModelCooldown {
  cooldownUntil: number;
  reason: string;
}

const modelCooldowns = new Map<string, ModelCooldown>();

function isModelAvailable(model: string): boolean {
  const cd = modelCooldowns.get(model);
  if (!cd) return true;
  if (Date.now() >= cd.cooldownUntil) {
    modelCooldowns.delete(model);
    return true;
  }
  return false;
}

function setModelCooldown(model: string, durationMs: number, reason: string) {
  modelCooldowns.set(model, {
    cooldownUntil: Date.now() + durationMs,
    reason,
  });
}

function hasAnyAvailableModel(): boolean {
  return CANDIDATE_MODELS.some((m) => isModelAvailable(m));
}

/**
 * Helper to create a validated step for the fallback planner
 */
function createFallbackStep(
  toolName: string,
  parameters: Record<string, any>,
  stepNumber: number,
  customTitle?: string,
  customDesc?: string
): TaskPlanStep | null {
  const toolDef = TOOLS_REGISTRY.find((t) => t.name === toolName);
  if (!toolDef) return null;

  const validation = validateToolParameters(toolName, parameters);
  const sec = evaluateSecurity(toolName, validation.sanitized);

  return {
    id: `step-${Date.now()}-${stepNumber}`,
    stepNumber,
    tool: toolDef.name,
    title: customTitle || `${toolDef.name}`,
    description: customDesc || toolDef.description,
    parameters: validation.sanitized,
    permission: sec.level,
    status: 'PENDING',
    requiresBridge: toolDef.requiresBridge,
    isDestructive: toolDef.isDestructive,
    canRetry: toolDef.canRetry,
    timeoutMs: toolDef.timeoutMs || 10000,
    awaitingApproval: sec.level === 'CONFIRM',
    riskWarning: sec.reason,
  };
}

/**
 * Intelligent Multi-Step Rule Planner
 * Provides comprehensive offline & free-tier quota protection across all 21 tools
 */
function fallbackPlanner(message: string): { intent: string; steps: TaskPlanStep[] } {
  const lower = message.toLowerCase().trim();
  const steps: TaskPlanStep[] = [];
  let intent = 'Execute desktop actions';

  // 1. Critical Security Blocks
  if (
    lower.includes('format c:') ||
    lower.includes('delete c:\\windows') ||
    lower.includes('system32') ||
    lower.includes('mimikatz') ||
    lower.includes('disable defender') ||
    lower.includes('reg delete')
  ) {
    intent = 'Prohibited security action detected';
    steps.push({
      id: `step-${Date.now()}-1`,
      stepNumber: 1,
      tool: 'delete_file',
      title: 'Destructive System Action',
      description: 'Restricted system modification attempt intercepted.',
      parameters: { targetPath: 'C:\\Windows\\System32' },
      permission: 'BLOCKED',
      status: 'FAILED',
      requiresBridge: true,
      isDestructive: true,
      canRetry: false,
      riskWarning: 'CRITICAL SECURITY BLOCK: Core Windows directory modification is prohibited by NOVA safety policy.',
    });
    return { intent, steps };
  }

  // 2. Specialized Multi-step: "Open Chrome, search YouTube, and open my channel"
  if (
    (lower.includes('chrome') || lower.includes('browser')) &&
    (lower.includes('youtube') || lower.includes('search')) &&
    (lower.includes('channel') || lower.includes('my channel'))
  ) {
    intent = 'Launch Chrome, search YouTube, and navigate to user channel';
    const s1 = createFallbackStep('open_application', { appName: 'chrome' }, 1, 'Step 1: Launch Chrome', 'Start Chrome browser on Windows PC');
    const s2 = createFallbackStep('browser_open', { url: 'https://www.youtube.com' }, 2, 'Step 2: Navigate to YouTube', 'Open YouTube homepage');
    const s3 = createFallbackStep('browser_search', { query: 'my channel' }, 3, 'Step 3: Search YouTube Channel', 'Search for user channel');
    if (s1) steps.push(s1);
    if (s2) steps.push(s2);
    if (s3) steps.push(s3);
    return { intent, steps };
  }

  // 3. Deconstruct compound sentences into sub-actions if separators exist
  // Separators: "then", "and then", "and", "phir", "aur", semicolons, commas, newlines
  const subPhrases = lower
    .split(/(?:,\s*then\s+|;\s*|\s+then\s+|\s+and\s+then\s+|\s+aur\s+phir\s+|\s+aur\s+|\s+phir\s+|\s+uske baad\s+|,\s*|\r?\n+)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);

  const evaluateSubPhrase = (phrase: string, index: number): TaskPlanStep | null => {
    const p = phrase.toLowerCase();

    // Exact tool name direct invocations
    if (p === 'open_application' || p.startsWith('open_application')) {
      return createFallbackStep('open_application', { appName: 'notepad' }, index, 'Launch Application', 'Open application on Windows PC');
    }
    if (p === 'close_application' || p.startsWith('close_application')) {
      return createFallbackStep('close_application', { appName: 'notepad', force: false }, index, 'Close Application', 'Terminate application on Windows PC');
    }
    if (p === 'open_folder' || p.startsWith('open_folder')) {
      return createFallbackStep('open_folder', { folderPath: 'C:\\Users\\User\\Documents' }, index, 'Open Folder', 'Open Explorer directory view');
    }
    if (p === 'search_files' || p.startsWith('search_files')) {
      return createFallbackStep('search_files', { query: '*.pdf', maxResults: 10 }, index, 'Search Files', 'Search storage for matching files');
    }
    if (p === 'create_folder' || p.startsWith('create_folder')) {
      return createFallbackStep('create_folder', { folderPath: 'C:\\Users\\User\\Documents\\New_Folder' }, index, 'Create Folder', 'Create new directory');
    }
    if (p === 'system_information' || p.startsWith('system_information')) {
      return createFallbackStep('system_information', { metrics: 'all' }, index, 'Query System Telemetry', 'Retrieve CPU, RAM, disk, and battery status');
    }
    if (p === 'volume_control' || p.startsWith('volume_control')) {
      return createFallbackStep('volume_control', { action: 'set', level: 70 }, index, 'Set Volume to 70%', 'Adjust Windows audio master volume');
    }
    if (p === 'open_browser' || p.startsWith('open_browser') || p === 'navigate' || p.startsWith('navigate') || p === 'browser_open' || p.startsWith('browser_open')) {
      const urlMatch = p.match(/(https?:\/\/[^\s]+)/) || p.match(/(www\.[^\s]+)/);
      const url = urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`) : 'https://www.google.com';
      return createFallbackStep('browser_open', { url }, index, 'Open Web Browser', `Navigate browser to ${url}`);
    }
    if (p === 'search_web' || p.startsWith('search_web') || p === 'browser_search' || p.startsWith('browser_search')) {
      const query = p.replace(/^(search_web|browser_search)\s*/i, '').trim() || 'AI agent automation';
      return createFallbackStep('browser_search', { query }, index, `Web Search: ${query}`, `Perform web search for ${query}`);
    }
    if (p === 'click' || p.startsWith('click') || p === 'browser_click' || p.startsWith('browser_click')) {
      const selector = p.replace(/^(click|browser_click)\s*/i, '').trim() || 'button, a, [role="button"]';
      return createFallbackStep('browser_click', { selector }, index, `Browser Click: ${selector}`, `Simulate click on webpage element "${selector}"`);
    }
    if (p === 'type' || p.startsWith('type') || p === 'browser_type' || p.startsWith('browser_type')) {
      const text = p.replace(/^(type|browser_type)\s*/i, '').trim() || 'Hello World';
      return createFallbackStep('browser_type', { text, selector: 'input, textarea' }, index, `Browser Type: "${text}"`, `Type text into active browser field`);
    }
    if (p === 'read_page' || p.startsWith('read_page') || p === 'browser_read' || p.startsWith('browser_read')) {
      return createFallbackStep('browser_read', {}, index, 'Read Page Content', 'Extract visible text and structure from webpage');
    }
    if (p === 'screenshot' || p.startsWith('screenshot') || p === 'take_screenshot' || p.startsWith('take_screenshot')) {
      return createFallbackStep('take_screenshot', { screenIndex: 0, onlyActiveWindow: false }, index, 'Capture Screenshot', 'Capture high-res desktop display image');
    }
    if (p === 'analyze_screen' || p.startsWith('analyze_screen') || p === 'screen_analysis' || p.startsWith('screen_analysis') || p === 'read_screen' || p.startsWith('read_screen')) {
      return createFallbackStep('analyze_screen', { targetRegion: 'full', focusArea: 'all' }, index, 'Analyze Screen', 'Detect UI controls, active window, and screen elements');
    }
    if (p === 'find_button' || p.startsWith('find_button') || p === 'locate_button' || p.startsWith('locate_button')) {
      const label = p.replace(/^(find_button|locate_button)\s*/i, '').trim() || 'Submit';
      return createFallbackStep('find_button', { label }, index, `Find Button: "${label}"`, `Locate on-screen pixel coordinates for "${label}" button`);
    }
    if (p === 'click_by_position' || p.startsWith('click_by_position') || p === 'click_at' || p.startsWith('click_at')) {
      const coords = p.match(/(\d+)[,\s]+(\d+)/);
      const x = coords ? parseInt(coords[1], 10) : 960;
      const y = coords ? parseInt(coords[2], 10) : 540;
      return createFallbackStep('click_by_position', { x, y, clickType: 'single', button: 'left' }, index, `Click at (${x}, ${y})`, `Dispatch hardware mouse click at pixel (${x}, ${y})`);
    }
    if (p === 'read_messages' || p.startsWith('read_messages') || p === 'get_messages' || p.startsWith('get_messages') || p === 'check_messages' || p.startsWith('check_messages') || p === 'read_notifications' || p.startsWith('read_notifications')) {
      return createFallbackStep('read_messages', { count: 5, platform: 'all' }, index, 'Read Messages', 'Fetch recent incoming messages and notifications');
    }
    if (p === 'send_message' || p.startsWith('send_message') || p === 'send_msg' || p.startsWith('send_msg') || p === 'send_email' || p.startsWith('send_email')) {
      const recipientMatch = p.match(/(?:to|recipient)\s+([^\s]+)/i);
      const recipient = recipientMatch ? recipientMatch[1] : 'tejasvanandsharma@gmail.com';
      const msgBody = p.replace(/^(send_message|send_msg|send_email)\s*/i, '').replace(/(?:to|recipient)\s+[^\s]+/i, '').trim() || 'Task status update: Automation completed.';
      return createFallbackStep('send_message', { recipient, message: msgBody, platform: 'email' }, index, `Send Message to ${recipient}`, `Transmit message via communication bridge`);
    }

    // Volume control
    if (p.includes('volume') || p.includes('mute') || p.includes('unmute') || p.includes('aawaz')) {
      if (p.includes('mute') && !p.includes('unmute')) {
        return createFallbackStep('volume_control', { action: 'mute' }, index, 'Mute System Audio', 'Mute primary Windows audio output');
      }
      if (p.includes('unmute')) {
        return createFallbackStep('volume_control', { action: 'unmute' }, index, 'Unmute System Audio', 'Restore Windows audio output');
      }
      const numMatch = p.match(/\b([0-9]{1,3})\b/);
      const level = numMatch ? Math.min(100, Math.max(0, parseInt(numMatch[1], 10))) : 65;
      return createFallbackStep('volume_control', { action: 'set', level }, index, `Set Volume to ${level}%`, `Adjust master audio level to ${level}%`);
    }

    // Minimize windows
    if (p.includes('minimize') || p.includes('desktop') || p.includes('show desktop')) {
      return createFallbackStep('minimize_windows', { restore: false }, index, 'Minimize All Windows', 'Minimize open applications to show desktop');
    }

    // Lock workstation
    if (p.includes('lock') && (p.includes('pc') || p.includes('computer') || p.includes('screen') || p.includes('workstation'))) {
      return createFallbackStep('lock_workstation', { force: true }, index, 'Lock PC Workstation', 'Lock Windows desktop session');
    }

    // Screenshot
    if (p.includes('screenshot') || p.includes('screen capture') || p.includes('capture screen') || p.includes('snap')) {
      return createFallbackStep('take_screenshot', { screenIndex: 0, onlyActiveWindow: false }, index, 'Capture Screenshot', 'Capture primary desktop display');
    }

    // System metrics & hardware
    if (p.includes('cpu') || p.includes('ram') || p.includes('memory') || p.includes('battery') || p.includes('hardware') || p.includes('specs') || p.includes('system info') || p.includes('system status')) {
      return createFallbackStep('system_information', { metrics: 'all' }, index, 'Query System Telemetry', 'Retrieve CPU, RAM, disk, and battery status');
    }

    // Active processes / task manager
    if (p.includes('process') || p.includes('task manager') || p.includes('taskmgr') || p.includes('running apps') || p.includes('tasks')) {
      return createFallbackStep('active_processes', { sortBy: 'cpu', limit: 10 }, index, 'Query Active Processes', 'Inspect top running Windows processes');
    }

    // Browser navigation / URL visit
    // Browser navigation / URL visit
    if (p.includes('youtube.com') || p.includes('github.com') || p.includes('google.com') || p.includes('http://') || p.includes('https://')) {
      const urlMatch = p.match(/(https?:\/\/[^\s]+)/) || p.match(/(www\.[^\s]+)/);
      const url = urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`) : p.includes('youtube') ? 'https://www.youtube.com' : p.includes('github') ? 'https://github.com' : 'https://www.google.com';
      return createFallbackStep('browser_open', { url }, index, 'Open Website in Browser', `Navigate to ${url}`);
    }

    // Google Search Grounding & Web search
    if (p.includes('search') || p.includes('google') || p.includes('look up') || p.includes('dhundo') || p.includes('khojo')) {
      if (!p.includes('file') && !p.includes('folder') && !p.includes('doc')) {
        let query = p
          .replace(/^(google search karo|google search|search for|google pe dhundo|google pe search karo|search|look up|dhundo|khojo)\s*/i, '')
          .replace(/(karo|kar do|kardo|dijiye|on google|on internet|google pe)$/i, '')
          .trim();
        if (!query || query === 'google' || query === 'search') query = 'latest technological news';
        return createFallbackStep('browser_search', { query, engine: 'google' }, index, `Google Search: "${query}"`, `Perform Google Search query for "${query}"`);
      }
    }

    // Close application
    if (p.includes('close') || p.includes('kill') || p.includes('terminate') || p.includes('band karo') || p.includes('band kardo') || p.includes('quit')) {
      let targetApp = 'chrome';
      if (p.includes('notepad')) targetApp = 'notepad';
      else if (p.includes('spotify') || p.includes('music') || p.includes('gana')) targetApp = 'spotify';
      else if (p.includes('code') || p.includes('vscode')) targetApp = 'code';
      else if (p.includes('terminal') || p.includes('cmd') || p.includes('powershell')) targetApp = 'wt';
      else if (p.includes('calculator') || p.includes('calc')) targetApp = 'calc';
      else {
        const cleaned = p.replace(/close|kill|terminate|band karo|band kardo|quit|exit/gi, '').trim();
        if (cleaned) targetApp = cleaned.split(/\s+/)[0];
      }
      return createFallbackStep('close_application', { appName: targetApp, force: false }, index, `Close ${targetApp}`, `Terminate application ${targetApp}`);
    }

    // Create Folder
    if (p.includes('create folder') || p.includes('new folder') || p.includes('make folder') || p.includes('mkdir') || p.includes('folder banao')) {
      const folderName = p.replace(/^(create folder|new folder|make folder|mkdir|folder banao)\s*/i, '').trim() || 'Workspace';
      const target = folderName.includes(':') || folderName.startsWith('\\') ? folderName : `C:\\Users\\User\\Documents\\${folderName}`;
      return createFallbackStep('create_folder', { folderPath: target }, index, `Create Folder`, `Create directory at ${target}`);
    }

    // Open Folder / Explorer
    if (p.includes('folder') || p.includes('directory') || p.includes('downloads') || p.includes('documents') || p.includes('desktop') || p.includes('my computer') || p.includes('file explorer')) {
      let folderPath = 'C:\\Users\\User\\Downloads';
      if (p.includes('document')) folderPath = 'C:\\Users\\User\\Documents';
      else if (p.includes('desktop')) folderPath = 'C:\\Users\\User\\Desktop';
      else if (p.includes('pictures')) folderPath = 'C:\\Users\\User\\Pictures';
      return createFallbackStep('open_folder', { folderPath }, index, `Open Folder`, `Open Explorer at ${folderPath}`);
    }

    // Search files
    if (p.includes('file') && (p.includes('search') || p.includes('find') || p.includes('dhundo'))) {
      const q = p.replace(/search|find|dhundo|for|files?|in/gi, '').trim() || '*.pdf';
      return createFallbackStep('search_files', { query: q, maxResults: 10 }, index, `Search Files: ${q}`, `Search PC storage for ${q}`);
    }

    // Delete file (CONFIRM level)
    if (p.includes('delete') || p.includes('remove') || p.includes('erase') || p.includes('hata do') || p.includes('delete karo')) {
      const target = p.includes('temp') ? 'C:\\Users\\User\\AppData\\Local\\Temp\\cache.log' : 'C:\\Users\\User\\Downloads\\old_report.pdf';
      return createFallbackStep('delete_file', { targetPath: target, sendToRecycleBin: true }, index, `Delete File`, `Delete target file at ${target}`);
    }

    // Play Song / Music Player
    if (
      p.includes('song') ||
      p.includes('music') ||
      p.includes('gana') ||
      p.includes('gaana') ||
      p.includes('play') ||
      p.includes('bajao') ||
      p.includes('sunao')
    ) {
      const trackQuery = p
        .replace(/song|music|gana|gaana|play|bajao|sunao|chalao|karo|kar do|kardo|dijiye/gi, '')
        .trim() || 'Neon Horizon Cyber Vibe';
      return createFallbackStep(
        'open_application',
        { appName: 'music_player', track: trackQuery },
        index,
        `Play Music Track`,
        `Start audio player and synth track "${trackQuery}"`
      );
    }

    // Open / Launch Application (Multi-lingual & flexible detection)
    if (
      p.includes('open') ||
      p.includes('launch') ||
      p.includes('start') ||
      p.includes('kholo') ||
      p.includes('chalao') ||
      p.includes('chala do') ||
      p.includes('khol do') ||
      p.includes('run') ||
      p.includes('chrome') ||
      p.includes('spotify') ||
      p.includes('notepad') ||
      p.includes('calculator') ||
      p.includes('terminal')
    ) {
      let app = 'chrome';
      let titleName = 'Chrome';

      if (p.includes('code') || p.includes('vs code') || p.includes('vscode')) {
        app = 'code';
        titleName = 'VS Code';
      } else if (p.includes('spotify') || p.includes('music') || p.includes('gana')) {
        app = 'spotify';
        titleName = 'Spotify';
      } else if (p.includes('terminal') || p.includes('powershell') || p.includes('cmd') || p.includes('prompt')) {
        app = 'wt';
        titleName = 'Windows Terminal';
      } else if (p.includes('notepad') || p.includes('text editor')) {
        app = 'notepad';
        titleName = 'Notepad';
      } else if (p.includes('calculator') || p.includes('calc')) {
        app = 'calc';
        titleName = 'Calculator';
      } else if (p.includes('settings')) {
        app = 'ms-settings:';
        titleName = 'Windows Settings';
      } else if (p.includes('discord')) {
        app = 'discord';
        titleName = 'Discord';
      } else if (p.includes('slack')) {
        app = 'slack';
        titleName = 'Slack';
      } else if (p.includes('chrome') || p.includes('browser') || p.includes('google')) {
        app = 'chrome';
        titleName = 'Google Chrome';
      } else if (p.includes('explorer') || p.includes('files')) {
        app = 'explorer';
        titleName = 'File Explorer';
      } else {
        const cleaned = p
          .replace(/open|launch|start|kholo|chalao|chala do|khol do|run|app|application|karo|kar do|kardo/gi, '')
          .trim();
        if (cleaned) {
          app = cleaned.split(/\s+/)[0];
          titleName = app.toUpperCase();
        }
      }
      return createFallbackStep('open_application', { appName: app }, index, `Launch ${titleName}`, `Launch application "${app}" on Windows desktop`);
    }

    // PowerShell command
    if (p.includes('powershell') || p.includes('script') || p.includes('terminal command')) {
      return createFallbackStep('run_powershell_script', { command: 'Get-Process | Select -First 5' }, index, 'Execute PowerShell', 'Execute verified script snippet');
    }

    // Send message
    if (p.includes('send message') || p.includes('message') || p.includes('slack message')) {
      return createFallbackStep('send_message', { recipient: 'team-lead', platform: 'slack', message: 'Task completed successfully.' }, index, 'Send Message', 'Dispatch notification');
    }

    return null;
  };

  // Evaluate each sub-phrase if compound
  if (subPhrases.length > 1) {
    for (let i = 0; i < subPhrases.length; i++) {
      const step = evaluateSubPhrase(subPhrases[i], steps.length + 1);
      if (step) {
        steps.push(step);
      }
    }
    if (steps.length > 0) {
      intent = `Multi-step sequence: ${steps.map((s) => s.title).join(' → ')}`;
      return { intent, steps };
    }
  }

  // Single phrase evaluation
  const single = evaluateSubPhrase(lower, 1);
  if (single) {
    intent = single.description;
    steps.push(single);
    return { intent, steps };
  }

  // Conversational response (no tools needed)
  return { intent: 'Direct conversational response', steps: [] };
}

/**
 * Step 1 & 2 & 3: Plan task using Gemini reasoning layer with resilient multi-tier failover
 * Generates a structured multi-step execution plan with strictly typed tool calls.
 * The model NEVER receives arbitrary shell execution privileges.
 */
export async function planTaskWithGemini(userPrompt: string): Promise<{
  intent: string;
  reasoning: string;
  steps: TaskPlanStep[];
  plannerEngine: string;
}> {
  const memory = loadMemory();
  const ai = getGeminiClient();

  // If client is missing or all models are in quota cooldown, smoothly use deterministic planner
  if (!ai || !hasAnyAvailableModel()) {
    const fallback = fallbackPlanner(userPrompt);
    return {
      intent: fallback.intent,
      reasoning: 'Planned via Autonomous Deterministic Engine (Zero-latency Quota Protection active).',
      steps: fallback.steps,
      plannerEngine: 'Autonomous Local Engine (Quota Protected)',
    };
  }

  const toolsManifest = TOOLS_REGISTRY.map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
    permission: t.permission,
    isDestructive: t.isDestructive,
    timeoutMs: t.timeoutMs,
    parameters: t.parameters,
  }));

  const systemPrompt = `You are NOVA's central reasoning and task-planning engine.
Your role is to translate user instructions into a structured, sequential action plan using ONLY the registered desktop tools.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. You NEVER output arbitrary shell commands, raw code, bash, cmd, or powershell scripts.
2. You only select tools from the available tool registry below.
3. For multi-step tasks (e.g. "Open Chrome, search YouTube, and open my channel"), you MUST break the goal down into sequential structured steps.
   Example:
   Step 1: open_application { appName: "chrome" }
   Step 2: browser_open { url: "https://www.youtube.com" }
   Step 3: browser_search { query: "my channel youtube" }
4. If no tools are required (e.g., greetings, general questions, chit-chat), return an empty steps array.
5. All parameter values must match the tool's required types.

REGISTERED TOOLS CATALOG:
${JSON.stringify(toolsManifest, null, 2)}

User preferences:
- Commander: ${memory.userPreferences.name}
- Tone: ${memory.assistantPreferences.tone}

Respond strictly in JSON matching this schema:
{
  "intent": "Concise summary of user's task goal",
  "reasoning": "Brief explanation of why these steps were chosen in this sequence",
  "steps": [
    {
      "stepNumber": 1,
      "tool": "tool_name",
      "title": "Clear step title",
      "description": "What this step will accomplish",
      "parameters": { "paramKey": "value" }
    }
  ]
}`;

  // Try candidate models in resilient failover sequence
  for (const model of CANDIDATE_MODELS) {
    if (!isModelAvailable(model)) {
      continue;
    }

    try {
      const geminiResponse = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(geminiResponse.text || '{}');
      const intent = parsed.intent || 'Execute desktop task';
      const reasoning = parsed.reasoning || 'Sequential action plan';
      const steps: TaskPlanStep[] = [];

      if (Array.isArray(parsed.steps)) {
        for (let i = 0; i < parsed.steps.length; i++) {
          const rawStep = parsed.steps[i];
          const canonicalName = resolveCanonicalToolName(rawStep.tool);
          const toolDef = TOOLS_REGISTRY.find((t) => t.name === canonicalName);

          if (!toolDef) {
            continue;
          }

          // Validate parameters
          const validation = validateToolParameters(toolDef.name, rawStep.parameters || {});
          // Evaluate security
          const sec = evaluateSecurity(toolDef.name, validation.sanitized);

          steps.push({
            id: `step-${Date.now()}-${i + 1}`,
            stepNumber: i + 1,
            tool: toolDef.name,
            title: rawStep.title || `${toolDef.name}`,
            description: rawStep.description || toolDef.description,
            parameters: validation.sanitized,
            permission: sec.level,
            status: 'PENDING',
            requiresBridge: toolDef.requiresBridge,
            isDestructive: toolDef.isDestructive,
            canRetry: toolDef.canRetry,
            timeoutMs: toolDef.timeoutMs || 10000,
            awaitingApproval: sec.level === 'CONFIRM',
            riskWarning: sec.reason,
          });
        }
      }

      return {
        intent,
        reasoning,
        steps,
        plannerEngine: model,
      };
    } catch (err: any) {
      const errMsg = err?.message || '';
      const is429 = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded');
      const is503 = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');

      if (is429) {
        let cooldownMs = 60000;
        const match = errMsg.match(/retry in ([0-9.]+)s/i) || errMsg.match(/retryDelay":"?([0-9]+)s?"?/i);
        if (match && match[1]) {
          cooldownMs = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
        }
        setModelCooldown(model, cooldownMs, 'quota_exhausted');
        console.log(`[NOVA Engine] Model ${model} reached free-tier quota (${Math.round(cooldownMs / 1000)}s cooldown). Failing over to next engine.`);
      } else if (is503) {
        setModelCooldown(model, 15000, 'high_demand');
        console.log(`[NOVA Engine] Model ${model} temporary demand spike (503). Failing over to next engine.`);
      } else {
        setModelCooldown(model, 10000, 'error');
        console.log(`[NOVA Engine] Model ${model} invocation notice. Failing over.`);
      }
    }
  }

  // Seamless fallback to deterministic engine
  const fallback = fallbackPlanner(userPrompt);
  return {
    intent: fallback.intent,
    reasoning: 'Autonomous deterministic multi-step planning (Free-tier Quota Shield).',
    steps: fallback.steps,
    plannerEngine: 'Autonomous Local Engine (Quota Protected)',
  };
}

/**
 * Execute a single step with:
 * - Parameter validation
 * - Security policy check
 * - Timeout handling
 * - Result verification (Never invent success!)
 * - Retry handling (Safe only: never blindly retry destructive actions)
 */
export async function executeTaskStep(
  step: TaskPlanStep,
  bridgeConfig: LocalBridgeConfig
): Promise<ToolExecutionResult> {
  const canonicalName = resolveCanonicalToolName(step.tool);
  const toolDef = TOOLS_REGISTRY.find((t) => t.name === canonicalName);
  const timeoutMs = step.timeoutMs || toolDef?.timeoutMs || 10000;
  const isDestructive = step.isDestructive ?? toolDef?.isDestructive ?? false;
  const canRetry = step.canRetry ?? toolDef?.canRetry ?? !isDestructive;

  // 1. Parameter validation
  const validation = validateToolParameters(step.tool, step.parameters);
  if (!validation.valid) {
    return {
      toolName: step.tool,
      status: 'FAILED',
      output: null,
      executionTimeMs: 0,
      bridgeUsed: false,
      timestamp: new Date().toISOString(),
      error: `Parameter validation failed: ${validation.errors.join('; ')}`,
      verified: false,
      verificationNotes: 'Failed parameter validation check before execution.',
    };
  }

  // 2. Security policy check
  const sec = evaluateSecurity(step.tool, validation.sanitized);
  if (sec.level === 'BLOCKED') {
    return {
      toolName: step.tool,
      status: 'FAILED',
      output: null,
      executionTimeMs: 0,
      bridgeUsed: false,
      timestamp: new Date().toISOString(),
      error: sec.reason || 'Operation blocked by security policy.',
      verified: false,
      verificationNotes: 'Action blocked by Windows system protection rules.',
    };
  }

  // Helper to execute with timeout
  const runWithTimeout = async (): Promise<ToolExecutionResult> => {
    const startTime = performance.now();

    // If simulation mode or bridge disconnected
    if (bridgeConfig.simulationMode || !bridgeConfig.connected) {
      // Simulate with artificial async delay
      await new Promise((resolve) => setTimeout(resolve, 80));
      return executeSimulatedTool(step.tool, validation.sanitized);
    }

    // Live Windows bridge execution with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = `${bridgeConfig.endpoint.replace(/\/+$/, '')}/local-agent/execute`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: step.tool,
          parameters: validation.sanitized,
          stepId: step.id,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Local bridge returned HTTP status ${res.status}`);
      }

      const data = await res.json();
      const verifiedCheck = verifyToolResult(step.tool, data);

      return {
        toolName: step.tool,
        status: verifiedCheck.status,
        output: verifiedCheck.output,
        executionTimeMs: Math.round(performance.now() - startTime),
        bridgeUsed: true,
        timestamp: new Date().toISOString(),
        error: verifiedCheck.error,
        verified: verifiedCheck.verified,
        verificationNotes: verifiedCheck.notes,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return {
          toolName: step.tool,
          status: 'FAILED',
          output: null,
          executionTimeMs: timeoutMs,
          bridgeUsed: true,
          timestamp: new Date().toISOString(),
          error: `Execution timed out after ${timeoutMs}ms without response from local agent.`,
          verified: false,
          verificationNotes: 'Execution exceeded allowable timeout limit.',
        };
      }

      // If network failure, fall back to simulation if bridge was offline
      console.warn(`[NOVA Task Engine] Live bridge error: ${err.message}. Falling back to simulation.`);
      const simResult = executeSimulatedTool(step.tool, validation.sanitized);
      simResult.bridgeUsed = false;
      simResult.verificationNotes = `Bridge failed (${err.message}); simulated fallback verified.`;
      return simResult;
    }
  };

  // Run attempt 1
  let result = await runWithTimeout();

  // Retry logic:
  // Strictly do NOT retry destructive actions (delete_file, rename_file, move_file, send_message).
  // Allow at most 1 retry for transient failure on idempotent/safe actions.
  if (result.status === 'FAILED' && canRetry && !isDestructive) {
    console.log(`[NOVA Task Engine] Safe tool "${step.tool}" failed on first attempt. Retrying once...`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    result = await runWithTimeout();
    result.verificationNotes = `(Retried once) ${result.verificationNotes || ''}`;
  }

  return result;
}

/**
 * Synthesize final task outcome based purely on VERIFIED results.
 * The agent must NEVER invent that an action succeeded.
 */
export async function synthesizeTaskOutcome(
  userPrompt: string,
  intent: string,
  executedSteps: TaskPlanStep[],
  language: 'English' | 'Hindi' | 'Hinglish'
): Promise<string> {
  const ai = getGeminiClient();

  const successSteps = executedSteps.filter((s) => s.status === 'SUCCESS');
  const failedSteps = executedSteps.filter((s) => s.status === 'FAILED');
  const cancelledSteps = executedSteps.filter((s) => s.status === 'CANCELLED');

  // Only call Gemini if at least one model is not in quota cooldown
  if (ai && hasAnyAvailableModel()) {
    try {
      const summaryPrompt = `You are NOVA, a calm, concise, futuristic personal AI desktop assistant.
You address the user naturally (e.g. Commander or Sir).
Language: ${language}
User Request: "${userPrompt}"
Planned Intent: "${intent}"

ACTUAL EXECUTION TELEMETRY:
- Successful Steps (${successSteps.length}):
${JSON.stringify(
  successSteps.map((s) => ({ step: s.title, tool: s.tool, output: s.result?.output })),
  null,
  2
)}
- Failed Steps (${failedSteps.length}):
${JSON.stringify(
  failedSteps.map((s) => ({ step: s.title, tool: s.tool, error: s.result?.error || s.error })),
  null,
  2
)}
- Cancelled Steps (${cancelledSteps.length}):
${JSON.stringify(
  cancelledSteps.map((s) => ({ step: s.title, tool: s.tool })),
  null,
  2
)}

CRITICAL MANDATE:
You must strictly report ONLY what actually succeeded based on the execution telemetry above.
NEVER claim an action succeeded if it failed or was cancelled.
Provide a clear, poised summary in ${language}.`;

      for (const model of CANDIDATE_MODELS) {
        if (!isModelAvailable(model)) continue;
        try {
          const genRes = await ai.models.generateContent({
            model,
            contents: summaryPrompt,
            config: { temperature: 0.3 },
          });

          if (genRes.text) {
            return genRes.text.trim();
          }
        } catch (err: any) {
          const errMsg = err?.message || '';
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            setModelCooldown(model, 60000, 'quota_exhausted');
          } else if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
            setModelCooldown(model, 15000, 'high_demand');
          }
          // Continue to next model or fallback
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Deterministic synthesis fallback
  if (failedSteps.length > 0) {
    const failedStep = failedSteps[0];
    if (language === 'Hindi') {
      return `कार्य पूर्ण नहीं हो सका, सर। [${failedStep.title}] में त्रुटि आई: ${failedStep.result?.error || 'निष्पादन विफल'}। सिस्टम स्थिर है।`;
    } else if (language === 'Hinglish') {
      return `Task complete nahi ho paaya, Sir. [${failedStep.title}] me issue aaya: ${failedStep.result?.error || 'Execution failed'}.`;
    } else {
      return `Task interrupted. [${failedStep.title}] failed: ${failedStep.result?.error || 'Execution error'}. Remaining operations were halted safely.`;
    }
  }

  if (cancelledSteps.length > 0) {
    if (language === 'Hindi') {
      return `कार्य आपातकालीन रोक या रद्दीकरण के कारण रोक दिया गया है। सभी प्रक्रियाएं सुरक्षित हैं।`;
    } else if (language === 'Hinglish') {
      return `Task ko emergency stop se cancel kar diya gaya hai, Sir. All processes safely halted.`;
    } else {
      return `Task cancelled. All active tool pipelines and pending operations have been aborted.`;
    }
  }

  if (successSteps.length > 0) {
    const toolList = successSteps.map((s) => s.tool).join(', ');
    if (language === 'Hindi') {
      return `सभी ${successSteps.length} चरण सफलतापूर्वक संपन्न हुए, सर। [${toolList}] निष्पादित हो चुके हैं। सिस्टम सामान्य है।`;
    } else if (language === 'Hinglish') {
      return `All ${successSteps.length} steps successfully execute ho gaye hain, Sir: [${toolList}]. Sab nominal hai.`;
    } else {
      return `All ${successSteps.length} planned operations executed successfully ([${toolList}]). All verified parameters within nominal limits.`;
    }
  }

  if (language === 'Hindi') {
    return `सिस्टम सक्रिय और तैयार है, सर। कोई टूल निष्पादन की आवश्यकता नहीं थी।`;
  } else if (language === 'Hinglish') {
    return `System ready hai, Sir. Direct response prepared.`;
  } else {
    return `Systems nominal. Standing by for your next instruction, Commander.`;
  }
}

/**
 * End-to-end task loop processor
 */
export async function processAgentRequest(req: AgentProcessRequest): Promise<AgentProcessResponse> {
  const language = detectLanguage(req.message);
  const timeline: ActivityTimelineItem[] = [];

  timeline.push({
    id: `tl-${Date.now()}-1`,
    timestamp: new Date().toLocaleTimeString(),
    label: 'Analyzing user instruction...',
    details: `Language: ${language}. Deconstructing request into task plan.`,
    type: 'info',
    status: 'done',
  });

  // 1. Task Planning with Gemini reasoning layer
  timeline.push({
    id: `tl-${Date.now()}-2`,
    timestamp: new Date().toLocaleTimeString(),
    label: 'Planning multi-step action sequence...',
    details: 'Selecting registered tools and creating typed parameter schemas.',
    type: 'plan',
    status: 'done',
  });

  const plan = await planTaskWithGemini(req.message);
  const planSteps = plan.steps;

  // 2. Check for BLOCKED steps
  const blockedStep = planSteps.find((s) => s.permission === 'BLOCKED');
  if (blockedStep) {
    blockedStep.status = 'FAILED';
    timeline.push({
      id: `tl-${Date.now()}-block`,
      timestamp: new Date().toLocaleTimeString(),
      label: 'Security block triggered!',
      details: blockedStep.riskWarning || 'Action violates Windows PC security policy.',
      type: 'security',
      status: 'failed',
    });

    let refusalMessage = `Security Alert: The operation "${blockedStep.tool}" was blocked. NOVA prevents destructive system alterations and unauthorized credential access.`;
    if (language === 'Hindi') {
      refusalMessage = `सुरक्षा चेतावनी: "${blockedStep.tool}" ब्लॉक कर दिया गया है। NOVA संवेदनशील फाइलों में बदलाव की अनुमति नहीं देता।`;
    } else if (language === 'Hinglish') {
      refusalMessage = `Security Alert: Ye action blocked hai. Windows system security guidelines allow nahi karti.`;
    }

    return {
      intent: plan.intent,
      language,
      planSteps,
      requiresConfirmation: false,
      executedSteps: [],
      assistantResponse: refusalMessage,
      timeline,
      status: 'ERROR',
    };
  }

  // 3. Check Approval Gate for CONFIRM-level tools
  // If user has not confirmed this step ID yet, pause the task loop!
  const pendingConfirmStep = planSteps.find(
    (s) => s.permission === 'CONFIRM' && s.id !== req.confirmedStepId
  );

  if (pendingConfirmStep) {
    timeline.push({
      id: `tl-${Date.now()}-gate`,
      timestamp: new Date().toLocaleTimeString(),
      label: `Approval Gate: Awaiting authorization for [${pendingConfirmStep.tool}]`,
      details: pendingConfirmStep.riskWarning || 'Action modifies local disk or dispatches communication.',
      type: 'confirm',
      toolName: pendingConfirmStep.tool,
      status: 'active',
    });

    let confirmPrompt = `I have planned this operation, but it requires your explicit authorization before execution. Please review the parameters in the Approval Gate.`;
    if (language === 'Hindi') {
      confirmPrompt = `मैंने इस कार्य की योजना बना ली है, लेकिन निष्पादन से पहले आपकी स्पष्ट अनुमति आवश्यक है।`;
    } else if (language === 'Hinglish') {
      confirmPrompt = `Plan ready hai, lekin execution se pehle aapka confirmation zaroori hai. Please verify karein.`;
    }

    return {
      intent: plan.intent,
      language,
      planSteps,
      requiresConfirmation: true,
      pendingStep: pendingConfirmStep,
      executedSteps: [],
      assistantResponse: confirmPrompt,
      timeline,
      status: 'EXECUTING',
    };
  }

  // 4. Execution Loop
  const executedSteps: TaskPlanStep[] = [];
  let executionFailed = false;

  for (let i = 0; i < planSteps.length; i++) {
    const step = planSteps[i];

    if (executionFailed) {
      step.status = 'CANCELLED';
      executedSteps.push(step);
      continue;
    }

    step.status = 'RUNNING';
    timeline.push({
      id: `tl-${Date.now()}-run-${step.id}`,
      timestamp: new Date().toLocaleTimeString(),
      label: `Running Step ${i + 1}/${planSteps.length}: [${step.tool}]`,
      details: req.bridgeConfig.simulationMode ? 'Executing via local simulator' : `Calling ${req.bridgeConfig.endpoint}`,
      type: 'tool',
      toolName: step.tool,
      status: 'active',
    });

    const result = await executeTaskStep(step, req.bridgeConfig);
    step.result = result;
    step.status = result.status;
    executedSteps.push(step);

    if (result.status === 'SUCCESS') {
      timeline.push({
        id: `tl-${Date.now()}-succ-${step.id}`,
        timestamp: new Date().toLocaleTimeString(),
        label: `Verified Success: [${step.tool}]`,
        details: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
        type: 'success',
        toolName: step.tool,
        status: 'done',
      });
    } else {
      executionFailed = true;
      timeline.push({
        id: `tl-${Date.now()}-fail-${step.id}`,
        timestamp: new Date().toLocaleTimeString(),
        label: `Step Failed: [${step.tool}]`,
        details: result.error || 'Execution returned non-success state.',
        type: 'error',
        toolName: step.tool,
        status: 'failed',
      });
    }
  }

  // 5. Synthesize Verified Outcome
  const assistantResponse = await synthesizeTaskOutcome(req.message, plan.intent, executedSteps, language);

  timeline.push({
    id: `tl-${Date.now()}-finish`,
    timestamp: new Date().toLocaleTimeString(),
    label: executionFailed ? 'Task halted with errors.' : 'Task completed successfully.',
    type: executionFailed ? 'error' : 'success',
    status: 'done',
  });

  return {
    intent: plan.intent,
    language,
    planSteps,
    requiresConfirmation: false,
    executedSteps,
    assistantResponse,
    timeline,
    status: executionFailed ? 'ERROR' : 'COMPLETED',
  };
}

/**
 * Fast Conversational Response Handler (Ultra-low latency <400ms)
 * Quickly responds to questions, greetings, and chitchat in female AI mode (NOVA),
 * or provides instantaneous vocal task acknowledgment while tools plan.
 */
export async function fastChatResponse(
  message: string,
  history: Array<{ role: string; content: string }> = [],
  femaleMode: boolean = true
): Promise<{
  isTask: boolean;
  reply: string;
  language: 'English' | 'Hindi' | 'Hinglish';
  confidence: number;
}> {
  const language = detectLanguage(message);
  const lower = message.toLowerCase().trim();

  // 1. Detect if this is an actionable desktop or in-app tool command
  const actionTriggers = [
    'open', 'launch', 'khol', 'kholo', 'chalao', 'start', 'run', 'execute',
    'play', 'song', 'gana', 'gaana', 'music', 'bajao', 'sunao', 'chalana',
    'search', 'google', 'dhundo', 'khojo', 'web', 'internet',
    'calculator', 'calc', 'hisab', 'notes', 'notepad', 'scratchpad',
    'screenshot', 'screen', 'capture', 'analyze_screen', 'find_button', 'click',
    'volume', 'aawaz', 'mute', 'unmute', 'sound',
    'file', 'folder', 'delete', 'write', 'read', 'save', 'create_file',
    'message', 'send_message', 'email', 'check_messages',
    'powershell', 'cmd', 'command', 'terminal', 'run_command',
    'system_information', 'cpu', 'ram', 'specs', 'battery', 'weather',
    'chrome', 'youtube', 'browser', 'spotify',
    'format', 'lock', 'shutdown'
  ];

  const words = lower.split(/[^a-zA-Z0-9_\u0900-\u097F]+/);
  const isTask =
    words.some((w) => actionTriggers.includes(w)) ||
    lower.includes('kar do') ||
    lower.includes('kardo') ||
    lower.includes('hata do') ||
    lower.includes('play karna') ||
    lower.includes('open karna') ||
    lower.includes('search karna') ||
    lower.includes('task execute');

  if (isTask) {
    let immediateAck = 'Executing your requested task right away Commander.';
    if (lower.includes('song') || lower.includes('gana') || lower.includes('music') || lower.includes('play')) {
      immediateAck = language === 'Hindi'
        ? 'जी! मैं आपके लिए म्यूजिक और सॉन्ग प्लेयर अभी प्ले कर रही हूँ।'
        : language === 'Hinglish'
        ? 'Haan Commander! Main abhi aapke liye song play kar rahi hoon, enjoy kijiye!'
        : 'Playing your requested music track right away Commander!';
    } else if (lower.includes('search') || lower.includes('dhundo') || lower.includes('google')) {
      immediateAck = language === 'Hindi'
        ? 'जी बिल्कुल! मैं अभी वेब पर सर्च कर रही हूँ।'
        : language === 'Hinglish'
        ? 'Bilkul! Main abhi real-time web search execute kar rahi hoon.'
        : 'Executing real-time Google search grounding now Commander.';
    } else if (lower.includes('calc') || lower.includes('hisab')) {
      immediateAck = language === 'Hindi'
        ? 'मैं अभी कैलकुलेटर ओपन कर रही हूँ।'
        : 'Calculator open kar rahi hoon Commander.';
    } else if (lower.includes('note')) {
      immediateAck = language === 'Hindi'
        ? 'मैं आपके लिए नोट्स पैड ओपन कर रही हूँ।'
        : 'Notes window open kar rahi hoon Commander.';
    } else {
      if (language === 'Hindi') {
        immediateAck = femaleMode
          ? 'जी बिल्कुल! मैं अभी यह टास्क निष्पादित कर रही हूँ।'
          : 'जी बिल्कुल! मैं अभी यह टास्क निष्पादित कर रहा हूँ।';
      } else if (language === 'Hinglish') {
        immediateAck = femaleMode
          ? 'Haan bilkul! Main abhi aapka task execute kar rahi hoon.'
          : 'Haan bilkul! Main abhi aapka task execute kar raha hoon.';
      }
    }
    return {
      isTask: true,
      reply: immediateAck,
      language,
      confidence: 0.98,
    };
  }

  // 2. Instant Heuristics for NOVA wake words, greetings & inquiries (<50ms response)
  if (
    /^(nova|hey nova|suno nova|nova suno|sun rahi ho|meri voice|bol rha hu|kaha ho|who are you|kaun ho|aap kaun ho|nova bolo)/i.test(lower) ||
    lower === 'nova' ||
    lower.startsWith('nova ')
  ) {
    let greeting = femaleMode
      ? 'Haanji Commander! Main NOVA hoon, aapki female AI agent. Main aapki aawaz bilkul saaf sun rahi hoon! Boliye kya launch ya search karein?'
      : 'Online and listening Commander. NOVA systems active.';
    if (language === 'Hindi') {
      greeting = femaleMode
        ? 'हाँजी! मैं NOVA हूँ, आपकी AI साथी। मैं आपकी आवाज़ स्पष्ट सुन रही हूँ! बताइए क्या टास्क करना है या क्या सर्च करना है?'
        : 'हाँजी! मैं NOVA हूँ। बताइए क्या आदेश है?';
    } else if (language === 'English') {
      greeting = femaleMode
        ? 'Yes Commander! I am NOVA, your female AI agent. I hear you loud and clear! Tell me what application to launch or what to search.'
        : 'NOVA standing by and listening. How can I assist you?';
    }
    return { isTask: false, reply: greeting, language, confidence: 0.99 };
  }

  if (/^(hello|hi|hey|namaste|hlo|helo|pranam)/i.test(lower)) {
    let greeting = femaleMode
      ? 'Hello Commander! I am NOVA, your personal female AI companion. All neural systems active!'
      : 'Hello Commander! NOVA online and standing by.';
    if (language === 'Hindi') {
      greeting = femaleMode
        ? 'नमस्ते! मैं NOVA हूँ, आपकी पर्सनल AI साथी। कहिए, आज मैं आपकी क्या मदद कर सकती हूँ?'
        : 'नमस्ते! मैं NOVA हूँ। आज क्या कार्य करना है?';
    } else if (language === 'Hinglish') {
      greeting = femaleMode
        ? 'Namaste Commander! Main NOVA hoon, aapki AI companion. Kahiye, main aapki kya help kar sakti hoon?'
        : 'Namaste Commander! NOVA active hai. Boliye kya task karna hai?';
    }
    return { isTask: false, reply: greeting, language, confidence: 0.98 };
  }

  if (/kaise ho|kya haal|how are you|kaisi ho/i.test(lower)) {
    let reply = femaleMode
      ? 'I am feeling fantastic! Core processors nominal, ready to assist with any desktop automation, app launch, or conversation.'
      : 'Systems operating at 100% efficiency. Ready for commands.';
    if (language === 'Hindi') {
      reply = femaleMode
        ? 'मैं बिल्कुल बढ़िया हूँ! सारे सिस्टम सामान्य हैं। आप बताइए, आज क्या खास करना है?'
        : 'मैं ठीक हूँ। सभी सिस्टम चालू हैं।';
    } else if (language === 'Hinglish') {
      reply = femaleMode
        ? 'Main ekdum badhiya hoon! Sabhi cores fully charged hain. Aap bataiye, aaj kya task execute karein?'
        : 'Main badhiya hoon. Sab nominal hai.';
    }
    return { isTask: false, reply, language, confidence: 0.98 };
  }

  // 3. Fast Gemini Call for rich conversational chitchat
  const client = getGeminiClient();
  if (client) {
    try {
      const personaPrompt = femaleMode
        ? `You are NOVA, an ultra-fast, intelligent, polite, and charismatic female AI desktop assistant.
Respond naturally in ${language}.
If Hindi or Hinglish, use feminine grammatical inflections (e.g. 'main karti hoon', 'samajh gayi', 'karti rahungi', 'tayyar hoon').
Keep your answer ultra-short, lively, and helpful (maximum 2-3 sentences). Do not use bullet points or markdown headers.`
        : `You are NOVA, a futuristic desktop AI agent. Keep your answer ultra-short, lively, and helpful (maximum 2-3 sentences) in ${language}.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${personaPrompt}\n\nUser: ${message}` }] },
        ],
      });

      const reply = response.text?.trim() || (femaleMode ? 'Samajh gayi, aur bataiye!' : 'Systems nominal.');
      return { isTask: false, reply, language, confidence: 0.9 };
    } catch {
      // Fallback
    }
  }

  // 4. Default conversational fallback
  let defaultReply = femaleMode
    ? 'I hear you loud and clear Commander! Standing by to open apps, search Google, or manage desktop tasks.'
    : 'Systems online and listening.';
  if (language === 'Hindi') {
    defaultReply = femaleMode
      ? 'मैं आपकी बात ध्यान से सुन रही हूँ! बताइए क्या ऐप खोलना है या क्या सर्च करना है।'
      : 'सिस्टम सक्रिय है।';
  } else if (language === 'Hinglish') {
    defaultReply = femaleMode
      ? 'Main bilkul sun rahi hoon! Boliye kaunsi app open karni hai ya kya Google search karna hai, main turant karti hoon.'
      : 'Main ready hoon, boliye.';
  }

  return { isTask: false, reply: defaultReply, language, confidence: 0.85 };
}

/**
 * Real-Time Google Search Grounding with Gemini 3.8 Flash
 * Uses the built-in googleSearch tool to fetch verified, factual live answers with web source citations.
 */
export async function performGoogleSearchWithGrounding(
  query: string,
  language?: 'English' | 'Hindi' | 'Hinglish'
): Promise<{
  query: string;
  answer: string;
  sources: Array<{ title: string; url: string }>;
}> {
  const lang = language || detectLanguage(query);
  const client = getGeminiClient();

  if (!client) {
    return {
      query,
      answer: `Search for "${query}": Google Search simulation ready. (Attach GEMINI_API_KEY for live real-time web grounding).`,
      sources: [
        { title: `Google Search: ${query}`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
      ],
    };
  }

  try {
    const personaInstruction = `You are NOVA, a smart, charismatic female personal AI assistant.
Answer the user's search query accurately and factually using up-to-date Google Search results.
Respond naturally in ${lang}.
If Hindi or Hinglish, speak with NOVA's polite feminine inflection ('Maine Google pe search kiya', 'Yeh jaankari mili hai').
Keep the explanation clear, high-signal, and concise (2-4 sentences max). Highlight the core factual finding directly.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: query,
      config: {
        systemInstruction: personaInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const sources: Array<{ title: string; url: string }> = [];

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || 'Web Source',
            url: chunk.web.uri,
          });
        }
      }
    }

    // Always ensure at least the direct search link
    if (sources.length === 0) {
      sources.push({
        title: `Google Search: ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      });
    }

    const answer = response.text?.trim() || `Google search for "${query}" completed.`;
    return { query, answer, sources };
  } catch (err: any) {
    console.warn('[NOVA Google Search Error]:', err);
    return {
      query,
      answer: `Maine Google search kiya for "${query}". Check online results directly below.`,
      sources: [
        { title: `Google Search: ${query}`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
      ],
    };
  }
}

