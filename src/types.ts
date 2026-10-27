/**
 * Core type definitions for NOVA Personal AI Desktop Assistant
 */

export type AgentStatus = 'IDLE' | 'LISTENING' | 'THINKING' | 'EXECUTING' | 'COMPLETED' | 'ERROR';

export type PermissionLevel = 'SAFE' | 'CONFIRM' | 'BLOCKED';

export type AvatarMode = 'female_ai' | 'orb';

export type AvatarTheme = 'royal_blue' | 'neon_cyan' | 'sakura_magenta' | 'matrix_emerald' | 'solis_amber';

export type AvatarGesture = 'idle' | 'wave' | 'explain' | 'think' | 'stance_shift' | 'cheer' | 'holo_typing';

export type ActiveAppWindow =
  | 'none'
  | 'music_player'
  | 'web_search'
  | 'calculator'
  | 'notes'
  | 'system_monitor'
  | 'terminal'
  | 'browser';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number; // in seconds
  audioUrl?: string;
  bpm: number;
}

/**
 * Standard Tool Execution States required by the agent architecture
 */
export type ToolExecutionState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type ToolCategory = 'system' | 'file' | 'browser' | 'media' | 'communication';

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  permission: PermissionLevel;
  confirmationRequired: boolean;
  requiresBridge: boolean; // True if execution requires the native Windows local companion
  isDestructive: boolean;  // If true, retries are strictly prohibited
  canRetry: boolean;       // Whether transient failures may be retried
  timeoutMs: number;       // Execution timeout in milliseconds (default: 10000ms)
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  jsonSchema?: Record<string, any>;
}

export interface ToolExecutionResult {
  toolName: string;
  status: ToolExecutionState;
  output: any;
  executionTimeMs: number;
  bridgeUsed: boolean;
  timestamp: string;
  error?: string;
  verified: boolean;
  verificationNotes?: string;
}

export interface TaskPlanStep {
  id: string;
  stepNumber: number;
  tool: string;
  title: string;
  description: string;
  parameters: Record<string, any>;
  permission: PermissionLevel;
  status: ToolExecutionState;
  requiresBridge: boolean;
  isDestructive?: boolean;
  canRetry?: boolean;
  retriesAttempted?: number;
  maxRetries?: number;
  timeoutMs?: number;
  awaitingApproval?: boolean;
  result?: ToolExecutionResult;
  riskWarning?: string;
  error?: string;
}

export interface AgentTaskPlan {
  taskId: string;
  userPrompt: string;
  intent: string;
  reasoning?: string;
  steps: TaskPlanStep[];
  currentStepIndex: number;
  status: 'PLANNING' | 'AWAITING_APPROVAL' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  finalResult?: string;
  totalDurationMs?: number;
  plannerEngine?: string;
}

export interface ActivityTimelineItem {
  id: string;
  timestamp: string;
  label: string;
  details?: string;
  type: 'info' | 'plan' | 'tool' | 'confirm' | 'bridge' | 'success' | 'error' | 'security';
  toolName?: string;
  status?: 'pending' | 'active' | 'done' | 'failed' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  languageDetected?: 'English' | 'Hindi' | 'Hinglish';
  planSteps?: TaskPlanStep[];
  toolResults?: ToolExecutionResult[];
  status?: AgentStatus;
}

export interface UserPreferences {
  name: string;
  preferredLanguage: 'auto' | 'english' | 'hindi' | 'hinglish';
  voiceEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  autoSpeak: boolean;
  theme: 'cyber-dark' | 'midnight-blue';
}

export interface AssistantPreferences {
  tone: 'calm-futuristic' | 'concise' | 'technical';
  brevity: 'balanced' | 'compact' | 'detailed';
  confirmAllDeletions: boolean;
  strictSafetyAudit: boolean;
}

export interface CustomCommand {
  id: string;
  trigger: string;
  description: string;
  actionTools: string[];
  templatePrompt: string;
}

export interface MemoryData {
  userPreferences: UserPreferences;
  assistantPreferences: AssistantPreferences;
  conversationSummaries: string[];
  frequentlyUsedApps: Array<{ name: string; path?: string; launches: number; category: string }>;
  customCommands: CustomCommand[];
  lastUpdated: string;
}

export interface LocalBridgeConfig {
  endpoint: string;
  connected: boolean;
  simulationMode: boolean;
  lastPingMs?: number;
  osInfo?: {
    platform: string;
    release: string;
    hostname: string;
    activeWindow?: string;
    cpuPercent?: number;
    memoryUsedPercent?: number;
  };
}

export interface AgentProcessRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  bridgeConfig: {
    endpoint: string;
    simulationMode: boolean;
    connected: boolean;
  };
  confirmedStepId?: string;
}

export interface AgentProcessResponse {
  intent: string;
  language: 'English' | 'Hindi' | 'Hinglish';
  planSteps: TaskPlanStep[];
  requiresConfirmation: boolean;
  pendingStep?: TaskPlanStep;
  executedSteps: TaskPlanStep[];
  assistantResponse: string;
  timeline: ActivityTimelineItem[];
  status: AgentStatus;
}
