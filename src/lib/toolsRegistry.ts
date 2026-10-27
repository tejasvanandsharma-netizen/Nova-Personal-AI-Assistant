/**
 * NOVA Tool Registry & Security Permission System
 *
 * Defines all 21 desktop and system tools with parameters schemas,
 * permission classifications (SAFE, CONFIRM, BLOCKED), JSON schemas,
 * parameter validation, timeout settings, and simulation executors.
 */

import { ToolDefinition, PermissionLevel, ToolExecutionResult, ToolExecutionState } from '../types';

export const TOOLS_REGISTRY: ToolDefinition[] = [
  {
    name: 'open_application',
    description: 'Launches a desktop application on the Windows PC (e.g., Chrome, VS Code, Spotify, Terminal, Notepad).',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        appName: {
          type: 'string',
          description: 'Name or executable of the application (e.g. chrome, code, notepad, spotify, powershell)',
        },
        args: {
          type: 'string',
          description: 'Optional command-line arguments to pass to the application',
        },
      },
      required: ['appName'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        appName: { type: 'string', minLength: 1 },
        args: { type: 'string' },
      },
      required: ['appName'],
      additionalProperties: true,
    },
  },
  {
    name: 'close_application',
    description: 'Closes or terminates a running desktop application or process by name.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        appName: {
          type: 'string',
          description: 'Process or window title name to terminate (e.g. notepad.exe, spotify, chrome)',
        },
        force: {
          type: 'boolean',
          description: 'Whether to forcefully kill the process if unresponsive',
        },
      },
      required: ['appName'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        appName: { type: 'string', minLength: 1 },
        force: { type: 'boolean' },
      },
      required: ['appName'],
      additionalProperties: true,
    },
  },
  {
    name: 'open_folder',
    description: 'Opens a directory in Windows File Explorer.',
    category: 'file',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Absolute or user path to open (e.g., C:\\Users\\User\\Downloads, Documents, Desktop)',
        },
      },
      required: ['folderPath'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        folderPath: { type: 'string', minLength: 1 },
      },
      required: ['folderPath'],
      additionalProperties: true,
    },
  },
  {
    name: 'search_files',
    description: 'Searches local PC storage for files matching a filename query or extension.',
    category: 'file',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 12000,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword or wildcard (e.g., report.pdf, *.docx, budget)',
        },
        directory: {
          type: 'string',
          description: 'Root folder to search within (defaults to user home or Documents)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
      },
      required: ['query'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
        directory: { type: 'string' },
        maxResults: { type: 'number', minimum: 1, maximum: 100 },
      },
      required: ['query'],
      additionalProperties: true,
    },
  },
  {
    name: 'create_folder',
    description: 'Creates a new folder or directory at the specified path.',
    category: 'file',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        folderPath: {
          type: 'string',
          description: 'Path of the directory to create',
        },
      },
      required: ['folderPath'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        folderPath: { type: 'string', minLength: 1 },
      },
      required: ['folderPath'],
      additionalProperties: true,
    },
  },
  {
    name: 'rename_file',
    description: 'Renames a file or directory. Modifies local storage.',
    category: 'file',
    permission: 'CONFIRM',
    confirmationRequired: true,
    requiresBridge: true,
    isDestructive: true, // Non-idempotent: Target name changes, do not blindly retry
    canRetry: false,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Full path of the file or folder to rename',
        },
        newName: {
          type: 'string',
          description: 'The new filename or folder name',
        },
      },
      required: ['targetPath', 'newName'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        targetPath: { type: 'string', minLength: 1 },
        newName: { type: 'string', minLength: 1 },
      },
      required: ['targetPath', 'newName'],
      additionalProperties: true,
    },
  },
  {
    name: 'move_file',
    description: 'Moves a file or folder from source path to destination path. Modifies filesystem.',
    category: 'file',
    permission: 'CONFIRM',
    confirmationRequired: true,
    requiresBridge: true,
    isDestructive: true, // Non-idempotent: Source is moved, do not blindly retry
    canRetry: false,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Source path of file or directory',
        },
        destinationPath: {
          type: 'string',
          description: 'Destination directory path',
        },
      },
      required: ['sourcePath', 'destinationPath'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        sourcePath: { type: 'string', minLength: 1 },
        destinationPath: { type: 'string', minLength: 1 },
      },
      required: ['sourcePath', 'destinationPath'],
      additionalProperties: true,
    },
  },
  {
    name: 'copy_file',
    description: 'Copies a file from source path to destination path.',
    category: 'file',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        sourcePath: {
          type: 'string',
          description: 'Source path of file to copy',
        },
        destinationPath: {
          type: 'string',
          description: 'Destination directory or target filepath',
        },
      },
      required: ['sourcePath', 'destinationPath'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        sourcePath: { type: 'string', minLength: 1 },
        destinationPath: { type: 'string', minLength: 1 },
      },
      required: ['sourcePath', 'destinationPath'],
      additionalProperties: true,
    },
  },
  {
    name: 'delete_file',
    description: 'Deletes a file or directory from storage. Always requires explicit user confirmation. Destructive action.',
    category: 'file',
    permission: 'CONFIRM',
    confirmationRequired: true,
    requiresBridge: true,
    isDestructive: true, // Strictly destructive: Never retry blindly!
    canRetry: false,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Target file or folder path to delete',
        },
        sendToRecycleBin: {
          type: 'boolean',
          description: 'Whether to move to Windows Recycle Bin instead of permanent deletion (default: true)',
        },
      },
      required: ['targetPath'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        targetPath: { type: 'string', minLength: 1 },
        sendToRecycleBin: { type: 'boolean' },
      },
      required: ['targetPath'],
      additionalProperties: true,
    },
  },
  {
    name: 'browser_open',
    description: 'Opens a specified URL in the default web browser (Chrome / Edge / Firefox).',
    category: 'browser',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: false,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL including https:// (e.g. https://github.com or https://www.youtube.com)',
        },
        browser: {
          type: 'string',
          description: 'Target browser (e.g. default, chrome, edge, firefox)',
        },
      },
      required: ['url'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        url: { type: 'string', minLength: 1 },
        browser: { type: 'string' },
      },
      required: ['url'],
      additionalProperties: true,
    },
  },
  {
    name: 'browser_search',
    description: 'Performs a web search on Google or default search engine.',
    category: 'browser',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: false,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
      },
      required: ['query'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
      },
      required: ['query'],
      additionalProperties: true,
    },
  },
  {
    name: 'browser_click',
    description: 'Simulates a mouse click on an element in the companion browser automation session.',
    category: 'browser',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector or accessible label of the button/link to click',
        },
      },
      required: ['selector'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        selector: { type: 'string', minLength: 1 },
      },
      required: ['selector'],
      additionalProperties: true,
    },
  },
  {
    name: 'browser_type',
    description: 'Types text into an active input field in the browser session.',
    category: 'browser',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of the input field',
        },
        text: {
          type: 'string',
          description: 'Text to type into the field',
        },
      },
      required: ['text'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        selector: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['text'],
      additionalProperties: true,
    },
  },
  {
    name: 'browser_read',
    description: 'Extracts the visible text or article summary from the current browser page.',
    category: 'browser',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to extract specific container text',
        },
      },
      required: [],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        selector: { type: 'string' },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'take_screenshot',
    description: 'Captures a high-resolution screenshot of the Windows desktop screen or active window.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 12000,
    parameters: {
      type: 'object',
      properties: {
        screenIndex: {
          type: 'number',
          description: 'Monitor index (0 for primary display)',
        },
        onlyActiveWindow: {
          type: 'boolean',
          description: 'Capture only the currently focused window',
        },
      },
      required: [],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        screenIndex: { type: 'number', minimum: 0 },
        onlyActiveWindow: { type: 'boolean' },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'read_screen',
    description: 'Performs OCR and optical analysis on the user display to understand current application context.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 15000,
    parameters: {
      type: 'object',
      properties: {
        targetRegion: {
          type: 'string',
          description: 'Region to analyze: "full", "active_window", or coordinates',
        },
      },
      required: [],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        targetRegion: { type: 'string' },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'analyze_screen',
    description: 'Performs deep vision analysis on the display or active window to detect UI elements, buttons, text blocks, and layout hierarchy.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 15000,
    parameters: {
      type: 'object',
      properties: {
        targetRegion: {
          type: 'string',
          description: 'Region to analyze: "full", "active_window", or coordinates box (e.g., "0,0,1920,1080")',
        },
        focusArea: {
          type: 'string',
          description: 'Element types to prioritize: "buttons", "inputs", "text", "all"',
        },
      },
      required: [],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        targetRegion: { type: 'string' },
        focusArea: { type: 'string' },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'find_button',
    description: 'Finds the on-screen pixel coordinates and bounding box for a button or interactive element by label or text.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 12000,
    parameters: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'The text label, title, or icon description of the button (e.g. "Save", "Submit", "Cancel", "OK", "Search")',
        },
        matchExact: {
          type: 'boolean',
          description: 'Whether to require exact text matching',
        },
      },
      required: ['label'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        label: { type: 'string' },
        matchExact: { type: 'boolean' },
      },
      required: ['label'],
      additionalProperties: true,
    },
  },
  {
    name: 'click_by_position',
    description: 'Simulates an OS-level mouse click at exact screen pixel coordinates (X, Y) with optional single, double, or right click.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        x: {
          type: 'number',
          description: 'Horizontal screen pixel coordinate (X)',
        },
        y: {
          type: 'number',
          description: 'Vertical screen pixel coordinate (Y)',
        },
        clickType: {
          type: 'string',
          description: 'Click type: "single", "double", "right"',
          enum: ['single', 'double', 'right'],
        },
        button: {
          type: 'string',
          description: 'Mouse button: "left", "right", "middle"',
          enum: ['left', 'right', 'middle'],
        },
      },
      required: ['x', 'y'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        clickType: { type: 'string', enum: ['single', 'double', 'right'] },
        button: { type: 'string', enum: ['left', 'right', 'middle'] },
      },
      required: ['x', 'y'],
      additionalProperties: true,
    },
  },
  {
    name: 'system_information',
    description: 'Retrieves hardware and OS telemetry: CPU load, RAM usage, storage space, battery, network status.',
    category: 'system',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        metrics: {
          type: 'string',
          description: 'Metrics requested: all, cpu, memory, battery, storage, network',
        },
      },
      required: [],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        metrics: { type: 'string' },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'volume_control',
    description: 'Adjusts master audio volume, mutes, or unmutes system sound on Windows.',
    category: 'media',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        level: {
          type: 'number',
          description: 'Volume percentage 0 to 100',
        },
        action: {
          type: 'string',
          description: 'set, mute, unmute, volume_up, volume_down',
          enum: ['set', 'mute', 'unmute', 'volume_up', 'volume_down'],
        },
      },
      required: ['action'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        level: { type: 'number', minimum: 0, maximum: 100 },
        action: {
          type: 'string',
          enum: ['set', 'mute', 'unmute', 'volume_up', 'volume_down'],
        },
      },
      required: ['action'],
      additionalProperties: true,
    },
  },
  {
    name: 'play_media',
    description: 'Controls media playback on Windows PC (play, pause, next track, previous track, or play target file).',
    category: 'media',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'play, pause, toggle, next, prev',
          enum: ['play', 'pause', 'toggle', 'next', 'prev'],
        },
        mediaQuery: {
          type: 'string',
          description: 'Optional song, playlist, or file path to play',
        },
      },
      required: ['command'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['play', 'pause', 'toggle', 'next', 'prev'],
        },
        mediaQuery: { type: 'string' },
      },
      required: ['command'],
      additionalProperties: true,
    },
  },
  {
    name: 'send_message',
    description: 'Dispatches an outgoing email or instant message through connected local apps. Always requires confirmation.',
    category: 'communication',
    permission: 'CONFIRM',
    confirmationRequired: true,
    requiresBridge: true,
    isDestructive: true, // Non-idempotent external dispatch: Never blindly retry!
    canRetry: false,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Recipient name, email address, or channel',
        },
        message: {
          type: 'string',
          description: 'Body of the message to transmit',
        },
        platform: {
          type: 'string',
          description: 'Communication client (e.g. Email, Slack, Discord, WhatsApp Desktop)',
        },
      },
      required: ['recipient', 'message'],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        recipient: { type: 'string', minLength: 1 },
        message: { type: 'string', minLength: 1 },
        platform: { type: 'string' },
      },
      required: ['recipient', 'message'],
      additionalProperties: true,
    },
  },
  {
    name: 'read_messages',
    description: 'Reads recent unread messages or notifications from email or communication client.',
    category: 'communication',
    permission: 'SAFE',
    confirmationRequired: false,
    requiresBridge: true,
    isDestructive: false,
    canRetry: true,
    timeoutMs: 10000,
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of recent messages to inspect (default: 5)',
        },
        platform: {
          type: 'string',
          description: 'Target platform: email, slack, discord, system_notifications',
        },
      },
      required: [],
    },
    jsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        count: { type: 'number', minimum: 1, maximum: 50 },
        platform: { type: 'string' },
      },
      required: [],
      additionalProperties: true,
    },
  },
];

/**
 * Universal Tool Name Aliases
 * Ensures caller compatibility between various naming conventions
 */
export const TOOL_ALIASES: Record<string, string> = {
  open_browser: 'browser_open',
  navigate: 'browser_open',
  browse: 'browser_open',
  search_web: 'browser_search',
  web_search: 'browser_search',
  click: 'browser_click',
  type: 'browser_type',
  read_page: 'browser_read',
  page_read: 'browser_read',
  screenshot: 'take_screenshot',
  capture_screen: 'take_screenshot',
  take_screen: 'take_screenshot',
  take_screenshot: 'take_screenshot',
  analyze_screen: 'analyze_screen',
  screen_analysis: 'analyze_screen',
  scan_screen: 'analyze_screen',
  screen_scan: 'analyze_screen',
  find_button: 'find_button',
  locate_button: 'find_button',
  find_element: 'find_button',
  click_by_position: 'click_by_position',
  click_at: 'click_by_position',
  mouse_click: 'click_by_position',
  click_coordinate: 'click_by_position',
  send_message: 'send_message',
  message_send: 'send_message',
  send_email: 'send_message',
  send_msg: 'send_message',
  read_messages: 'read_messages',
  get_messages: 'read_messages',
  read_emails: 'read_messages',
  check_messages: 'read_messages',
  read_notifications: 'read_messages',
};

export function resolveCanonicalToolName(name: string): string {
  const clean = (name || '').trim().toLowerCase();
  return TOOL_ALIASES[clean] || clean;
}

/**
 * Validate tool parameters against registered JSON Schema
 */
export function validateToolParameters(
  toolName: string,
  parameters: Record<string, any>
): { valid: boolean; errors: string[]; sanitized: Record<string, any> } {
  const canonicalName = resolveCanonicalToolName(toolName);
  const tool = TOOLS_REGISTRY.find((t) => t.name === canonicalName);
  if (!tool) {
    return {
      valid: false,
      errors: [`Tool "${toolName}" is not registered in the tool manifest.`],
      sanitized: parameters || {},
    };
  }

  const errors: string[] = [];
  const sanitized: Record<string, any> = { ...(parameters || {}) };

  // Alias normalization for flexible caller compatibility
  if (canonicalName === 'open_application' || canonicalName === 'close_application') {
    if (!sanitized.appName && sanitized.application) sanitized.appName = sanitized.application;
    if (!sanitized.appName && sanitized.app) sanitized.appName = sanitized.app;
    if (!sanitized.appName && sanitized.name) sanitized.appName = sanitized.name;
    if (!sanitized.appName && sanitized.process) sanitized.appName = sanitized.process;
  } else if (canonicalName === 'delete_file' || canonicalName === 'read_file') {
    if (!sanitized.targetPath && sanitized.path) sanitized.targetPath = sanitized.path;
    if (!sanitized.targetPath && sanitized.filePath) sanitized.targetPath = sanitized.filePath;
  } else if (canonicalName === 'open_folder' || canonicalName === 'create_folder') {
    if (!sanitized.folderPath && sanitized.path) sanitized.folderPath = sanitized.path;
    if (!sanitized.folderPath && sanitized.folder) sanitized.folderPath = sanitized.folder;
    if (!sanitized.folderPath && sanitized.directory) sanitized.folderPath = sanitized.directory;
    if (!sanitized.folderPath && sanitized.folderName) sanitized.folderPath = sanitized.folderName;
    if (!sanitized.folderPath && sanitized.name) sanitized.folderPath = sanitized.name;
  } else if (canonicalName === 'browser_open') {
    if (!sanitized.url && sanitized.link) sanitized.url = sanitized.link;
    if (!sanitized.url && sanitized.website) sanitized.url = sanitized.website;
    if (!sanitized.url && sanitized.address) sanitized.url = sanitized.address;
    if (!sanitized.url && sanitized.page) sanitized.url = sanitized.page;
    if (!sanitized.url && sanitized.query) sanitized.url = `https://www.google.com/search?q=${encodeURIComponent(sanitized.query)}`;
    if (!sanitized.url) sanitized.url = 'https://www.google.com';
  } else if (canonicalName === 'browser_search') {
    if (!sanitized.query && sanitized.search) sanitized.query = sanitized.search;
    if (!sanitized.query && sanitized.q) sanitized.query = sanitized.q;
    if (!sanitized.query && sanitized.keyword) sanitized.query = sanitized.keyword;
    if (!sanitized.query && sanitized.term) sanitized.query = sanitized.term;
    if (!sanitized.query && sanitized.text) sanitized.query = sanitized.text;
    if (!sanitized.query) sanitized.query = 'web search';
  } else if (canonicalName === 'browser_click') {
    if (!sanitized.selector && sanitized.target) sanitized.selector = sanitized.target;
    if (!sanitized.selector && sanitized.element) sanitized.selector = sanitized.element;
    if (!sanitized.selector && sanitized.button) sanitized.selector = sanitized.button;
    if (!sanitized.selector && sanitized.xpath) sanitized.selector = sanitized.xpath;
    if (!sanitized.selector && sanitized.text) sanitized.selector = `text="${sanitized.text}"`;
    if (!sanitized.selector) sanitized.selector = 'button, a, [role="button"]';
  } else if (canonicalName === 'browser_type') {
    if (!sanitized.text && sanitized.value) sanitized.text = sanitized.value;
    if (!sanitized.text && sanitized.content) sanitized.text = sanitized.content;
    if (!sanitized.text && sanitized.input) sanitized.text = sanitized.input;
    if (!sanitized.text && sanitized.message) sanitized.text = sanitized.message;
    if (!sanitized.text && sanitized.query) sanitized.text = sanitized.query;
    if (sanitized.text === undefined || sanitized.text === null) sanitized.text = '';
    if (!sanitized.selector && sanitized.target) sanitized.selector = sanitized.target;
    if (!sanitized.selector && sanitized.element) sanitized.selector = sanitized.element;
    if (!sanitized.selector && sanitized.field) sanitized.selector = sanitized.field;
    if (!sanitized.selector) sanitized.selector = 'input, textarea';
  } else if (canonicalName === 'browser_read') {
    if (!sanitized.selector && sanitized.target) sanitized.selector = sanitized.target;
  } else if (canonicalName === 'take_screenshot') {
    if (sanitized.screenIndex === undefined && sanitized.screen !== undefined) sanitized.screenIndex = Number(sanitized.screen);
    if (sanitized.screenIndex === undefined) sanitized.screenIndex = 0;
  } else if (canonicalName === 'search_files') {
    if (!sanitized.query && sanitized.search) sanitized.query = sanitized.search;
    if (!sanitized.query && sanitized.q) sanitized.query = sanitized.q;
    if (!sanitized.query && sanitized.filter) sanitized.query = sanitized.filter;
    if (!sanitized.query && sanitized.filename) sanitized.query = sanitized.filename;
    if (!sanitized.query && sanitized.name) sanitized.query = sanitized.name;
  } else if (canonicalName === 'volume_control') {
    if (sanitized.mute === true) sanitized.action = 'mute';
    else if (sanitized.mute === false || sanitized.unmute === true) sanitized.action = 'unmute';
    if (sanitized.volume !== undefined && sanitized.level === undefined) sanitized.level = Number(sanitized.volume);
    if (!sanitized.action) sanitized.action = 'set';
    if (sanitized.level === undefined && sanitized.action === 'set') sanitized.level = 65;
  } else if (canonicalName === 'system_information') {
    if (!sanitized.metrics) sanitized.metrics = 'all';
  } else if (canonicalName === 'analyze_screen') {
    if (!sanitized.targetRegion && sanitized.region) sanitized.targetRegion = sanitized.region;
    if (!sanitized.targetRegion) sanitized.targetRegion = 'full';
    if (!sanitized.focusArea && sanitized.focus) sanitized.focusArea = sanitized.focus;
    if (!sanitized.focusArea) sanitized.focusArea = 'all';
  } else if (canonicalName === 'find_button') {
    if (!sanitized.label && sanitized.button) sanitized.label = sanitized.button;
    if (!sanitized.label && sanitized.text) sanitized.label = sanitized.text;
    if (!sanitized.label && sanitized.name) sanitized.label = sanitized.name;
    if (!sanitized.label && sanitized.query) sanitized.label = sanitized.query;
    if (!sanitized.label && sanitized.target) sanitized.label = sanitized.target;
    if (!sanitized.label) sanitized.label = 'Submit';
  } else if (canonicalName === 'click_by_position') {
    if (sanitized.x === undefined && sanitized.left !== undefined) sanitized.x = Number(sanitized.left);
    if (sanitized.y === undefined && sanitized.top !== undefined) sanitized.y = Number(sanitized.top);
    if (sanitized.x === undefined && sanitized.posX !== undefined) sanitized.x = Number(sanitized.posX);
    if (sanitized.y === undefined && sanitized.posY !== undefined) sanitized.y = Number(sanitized.posY);
    if (sanitized.x === undefined) sanitized.x = 960;
    if (sanitized.y === undefined) sanitized.y = 540;
    sanitized.x = Number(sanitized.x);
    sanitized.y = Number(sanitized.y);
    if (!sanitized.clickType && sanitized.type) sanitized.clickType = sanitized.type;
    if (!sanitized.clickType) sanitized.clickType = 'single';
    if (!sanitized.button) sanitized.button = 'left';
  } else if (canonicalName === 'send_message') {
    if (!sanitized.recipient && sanitized.to) sanitized.recipient = sanitized.to;
    if (!sanitized.recipient && sanitized.email) sanitized.recipient = sanitized.email;
    if (!sanitized.recipient && sanitized.contact) sanitized.recipient = sanitized.contact;
    if (!sanitized.recipient && sanitized.channel) sanitized.recipient = sanitized.channel;
    if (!sanitized.recipient && sanitized.user) sanitized.recipient = sanitized.user;
    if (!sanitized.recipient) sanitized.recipient = 'tejasvanandsharma@gmail.com';
    if (!sanitized.message && sanitized.body) sanitized.message = sanitized.body;
    if (!sanitized.message && sanitized.text) sanitized.message = sanitized.text;
    if (!sanitized.message && sanitized.content) sanitized.message = sanitized.content;
    if (!sanitized.message && sanitized.msg) sanitized.message = sanitized.msg;
    if (!sanitized.message) sanitized.message = 'Notification from NOVA local agent.';
    if (!sanitized.platform && sanitized.client) sanitized.platform = sanitized.client;
    if (!sanitized.platform) sanitized.platform = 'Email';
  } else if (canonicalName === 'read_messages') {
    if (sanitized.count === undefined && sanitized.limit !== undefined) sanitized.count = Number(sanitized.limit);
    if (sanitized.count === undefined && sanitized.max !== undefined) sanitized.count = Number(sanitized.max);
    if (sanitized.count === undefined) sanitized.count = 5;
    sanitized.count = Number(sanitized.count);
    if (!sanitized.platform && sanitized.client) sanitized.platform = sanitized.client;
    if (!sanitized.platform) sanitized.platform = 'All';
  }

  // 1. Check required parameters
  for (const requiredKey of tool.parameters.required) {
    if (sanitized[requiredKey] === undefined || sanitized[requiredKey] === null || sanitized[requiredKey] === '') {
      errors.push(`Missing required parameter "${requiredKey}" for tool "${toolName}".`);
    }
  }

  // 2. Validate types and enums
  for (const [key, propDef] of Object.entries(tool.parameters.properties)) {
    const val = sanitized[key];
    if (val !== undefined && val !== null) {
      if (propDef.type === 'string' && typeof val !== 'string') {
        sanitized[key] = String(val);
      } else if (propDef.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`Parameter "${key}" must be a valid number.`);
        } else {
          sanitized[key] = num;
        }
      } else if (propDef.type === 'boolean' && typeof val !== 'boolean') {
        sanitized[key] = val === 'true' || val === 1 || val === true;
      }

      // Check enum constraint
      if (propDef.enum && !propDef.enum.includes(sanitized[key])) {
        errors.push(
          `Parameter "${key}" has invalid value "${sanitized[key]}". Expected one of: ${propDef.enum.join(', ')}.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Security Rule Engine
 * Evaluates whether a requested action or parameter is BLOCKED, requires CONFIRM, or is SAFE.
 */
export function evaluateSecurity(toolName: string, parameters: Record<string, any>): {
  level: PermissionLevel;
  reason?: string;
} {
  const canonicalName = resolveCanonicalToolName(toolName);
  const tool = TOOLS_REGISTRY.find((t) => t.name === canonicalName);
  if (!tool) {
    return { level: 'BLOCKED', reason: `Unknown tool "${toolName}" is blocked for security.` };
  }

  const paramStr = JSON.stringify(parameters).toLowerCase();

  // 1. Check BLOCKED patterns: Destructive mass actions & system destruction
  const blockedPatterns = [
    'rm -rf',
    'format c:',
    'format d:',
    'del /s /q c:',
    'c:\\windows\\system32',
    'system32',
    'mimikatz',
    'sam hive',
    'disable-windowsoptionalfeature',
    'set-mppreference -disablerealtimemonitoring true',
    'reg delete hklm',
    'drop database',
    'bypass executionpolicy',
    'curl | bash',
    'powershell -enc',
  ];

  for (const pattern of blockedPatterns) {
    if (paramStr.includes(pattern)) {
      return {
        level: 'BLOCKED',
        reason: `CRITICAL SECURITY BLOCK: Detected prohibited system risk pattern ("${pattern}"). Destruction of Windows system files or credential extraction is strictly blocked.`,
      };
    }
  }

  // 2. Check for sensitive target paths in delete/move/rename
  if (['delete_file', 'rename_file', 'move_file'].includes(toolName)) {
    const target = (parameters.targetPath || parameters.sourcePath || '').toLowerCase();
    if (
      target.includes('c:\\windows') ||
      target.includes('c:\\program files') ||
      target.includes('system volume information') ||
      target.includes('bootmgr')
    ) {
      return {
        level: 'BLOCKED',
        reason: `Target path "${target}" is a protected Windows operating system directory. Modification is blocked.`,
      };
    }
    return {
      level: 'CONFIRM',
      reason: `Action modifies or deletes local file storage ("${target}"). Explicit authorization required.`,
    };
  }

  // 3. Check for external communications
  if (toolName === 'send_message') {
    return {
      level: 'CONFIRM',
      reason: `Sending an outgoing communication to "${parameters.recipient || 'recipient'}" via ${parameters.platform || 'external client'}. Confirmation required before transmission.`,
    };
  }

  // 4. Default to tool's baseline permission
  return {
    level: tool.permission,
    reason: tool.confirmationRequired ? `This action requires verification before execution.` : undefined,
  };
}

/**
 * Strict Result Verification
 * The agent must NEVER invent that an action succeeded.
 * It strictly verifies the local agent/simulator reported success.
 */
export function verifyToolResult(
  toolName: string,
  rawResult: any
): { verified: boolean; status: ToolExecutionState; output: any; notes: string; error?: string } {
  if (!rawResult) {
    return {
      verified: false,
      status: 'FAILED',
      output: null,
      notes: 'Local agent returned no response or null payload.',
      error: 'Empty response received from execution bridge.',
    };
  }

  if (rawResult.status === 'CANCELLED') {
    return {
      verified: true,
      status: 'CANCELLED',
      output: rawResult.output,
      notes: 'Task step was cancelled by user emergency stop.',
    };
  }

  if (rawResult.error || rawResult.status === 'failed' || rawResult.status === 'FAILED') {
    return {
      verified: false,
      status: 'FAILED',
      output: rawResult.output || null,
      notes: `Execution reported an error: ${rawResult.error || 'Execution failed'}`,
      error: rawResult.error || 'Local execution failed.',
    };
  }

  // Inspect output payload
  const output = rawResult.output !== undefined ? rawResult.output : rawResult;
  if (output && typeof output === 'object') {
    if (output.success === false) {
      return {
        verified: false,
        status: 'FAILED',
        output,
        notes: `Agent reported failure in output: ${output.error || output.message || 'Operation failed'}`,
        error: output.error || output.message || 'Operation failed.',
      };
    }
  }

  return {
    verified: true,
    status: 'SUCCESS',
    output,
    notes: 'Action completed and verified with successful status response from agent.',
  };
}

/**
 * Sandbox / Mock Tool Executor
 * Used when the local companion bridge is in Simulation Mode or disconnected.
 * Produces realistic, typed telemetry responses so NOVA remains 100% operational immediately.
 */
export function executeSimulatedTool(toolName: string, parameters: Record<string, any>): ToolExecutionResult {
  const start = performance.now();
  const timestamp = new Date().toISOString();
  const canonicalName = resolveCanonicalToolName(toolName);

  switch (canonicalName) {
    case 'open_application':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 120),
        timestamp,
        verified: true,
        verificationNotes: `Verified process launch for ${parameters.appName}`,
        output: {
          success: true,
          message: `Application "${parameters.appName}" launched successfully.`,
          pid: Math.floor(1000 + Math.random() * 9000),
          windowTitle: `${(parameters.appName || 'APP').toUpperCase()} - Ready`,
        },
      };

    case 'close_application':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 80),
        timestamp,
        verified: true,
        verificationNotes: `Verified process termination for ${parameters.appName}`,
        output: {
          success: true,
          message: `Application "${parameters.appName}" closed gracefully.`,
        },
      };

    case 'open_folder':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 95),
        timestamp,
        verified: true,
        verificationNotes: `Verified Explorer directory view opened`,
        output: {
          success: true,
          message: `Opened Windows Explorer at "${parameters.folderPath}".`,
          resolvedPath: `C:\\Users\\User\\${(parameters.folderPath || 'Documents').replace(/^[/\\]+/, '')}`,
        },
      };

    case 'search_files':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 240),
        timestamp,
        verified: true,
        verificationNotes: `Search query completed with 3 matching files`,
        output: {
          success: true,
          query: parameters.query,
          foundCount: 3,
          results: [
            { path: `C:\\Users\\User\\Documents\\${parameters.query}`, size: '1.4 MB', modified: '2026-09-12 14:32' },
            { path: `C:\\Users\\User\\Downloads\\backup_${parameters.query}`, size: '4.2 MB', modified: '2026-09-10 09:15' },
            { path: `C:\\Users\\User\\Projects\\NOVA\\${parameters.query}`, size: '256 KB', modified: '2026-09-13 18:00' },
          ],
        },
      };

    case 'create_folder':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 65),
        timestamp,
        verified: true,
        verificationNotes: `Folder created at destination`,
        output: {
          success: true,
          message: `Folder created at "${parameters.folderPath}".`,
        },
      };

    case 'rename_file':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 75),
        timestamp,
        verified: true,
        verificationNotes: `Target renamed to ${parameters.newName}`,
        output: {
          success: true,
          message: `Renamed "${parameters.targetPath}" to "${parameters.newName}".`,
        },
      };

    case 'move_file':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 110),
        timestamp,
        verified: true,
        verificationNotes: `File moved to destination directory`,
        output: {
          success: true,
          message: `Moved "${parameters.sourcePath}" to "${parameters.destinationPath}".`,
        },
      };

    case 'copy_file':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 140),
        timestamp,
        verified: true,
        verificationNotes: `File copied to destination directory`,
        output: {
          success: true,
          message: `Copied "${parameters.sourcePath}" to "${parameters.destinationPath}".`,
        },
      };

    case 'delete_file':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 90),
        timestamp,
        verified: true,
        verificationNotes: `File moved to Recycle Bin`,
        output: {
          success: true,
          message: `Deleted "${parameters.targetPath}" (moved to Windows Recycle Bin).`,
        },
      };

    case 'browser_open':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 180),
        timestamp,
        verified: true,
        verificationNotes: `Browser navigated to ${parameters.url}`,
        output: {
          success: true,
          openedUrl: parameters.url,
          browser: parameters.browser || 'Default Browser (Chrome)',
          tabId: 104,
        },
      };

    case 'browser_search':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 210),
        timestamp,
        verified: true,
        verificationNotes: `Search query dispatched to search engine`,
        output: {
          success: true,
          query: parameters.query,
          searchUrl: `https://www.google.com/search?q=${encodeURIComponent(parameters.query)}`,
          summary: `Search dispatched for query "${parameters.query}". Results rendered in browser.`,
        },
      };

    case 'browser_click':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 150),
        timestamp,
        verified: true,
        verificationNotes: `Element click dispatched`,
        output: {
          success: true,
          message: `Clicked element matching "${parameters.selector}". Navigation triggered.`,
        },
      };

    case 'browser_type':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 130),
        timestamp,
        verified: true,
        verificationNotes: `Text typed into active input`,
        output: {
          success: true,
          message: `Typed "${parameters.text}" into target field.`,
        },
      };

    case 'browser_read':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 300),
        timestamp,
        verified: true,
        verificationNotes: `Page content extracted and parsed`,
        output: {
          success: true,
          title: 'Active Page - Windows Desktop Agent Protocol',
          url: 'https://github.com/nova-agent/docs',
          summaryText: 'Local Agent Bridge v1.2 active. All 21 RPC channels listening on 127.0.0.1:8765.',
        },
      };

    case 'take_screenshot':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 340),
        timestamp,
        verified: true,
        verificationNotes: `Display captured at 1920x1080`,
        output: {
          success: true,
          resolution: '1920x1080',
          display: 'Display #1 (Primary)',
          capturedAt: timestamp,
          format: 'image/png',
          previewSnippet: 'Desktop workspace captured with 4 active windows.',
        },
      };

    case 'read_screen':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 450),
        timestamp,
        verified: true,
        verificationNotes: `OCR text recognition verified`,
        output: {
          success: true,
          activeWindow: 'Visual Studio Code - NOVA Assistant',
          detectedTextSnippet: 'import { GoogleGenAI } from "@google/genai"; server running on port 3000',
          cursorPosition: { x: 940, y: 520 },
        },
      };

    case 'analyze_screen':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 480),
        timestamp,
        verified: true,
        verificationNotes: `Screen vision analysis completed on 1920x1080 display`,
        output: {
          success: true,
          resolution: '1920x1080',
          activeWindow: 'Google Chrome - Task Dashboard',
          detectedElements: [
            { type: 'button', label: 'Submit', x: 1040, y: 580, width: 96, height: 38, confidence: 0.98 },
            { type: 'button', label: 'Cancel', x: 1150, y: 580, width: 90, height: 38, confidence: 0.97 },
            { type: 'input', label: 'Search Query', x: 500, y: 220, width: 420, height: 42, confidence: 0.99 },
            { type: 'button', label: 'Save', x: 1420, y: 120, width: 80, height: 34, confidence: 0.95 },
            { type: 'button', label: 'Close', x: 1880, y: 20, width: 32, height: 32, confidence: 0.99 },
          ],
          textRegionsCount: 14,
          interactiveElementsCount: 5,
        },
      };

    case 'find_button': {
      const label = parameters.label || 'Submit';
      const cleanLabel = String(label).toLowerCase();
      let posX = 1040;
      let posY = 580;
      if (cleanLabel.includes('save')) { posX = 1420; posY = 120; }
      else if (cleanLabel.includes('cancel')) { posX = 1150; posY = 580; }
      else if (cleanLabel.includes('close')) { posX = 1880; posY = 20; }
      else if (cleanLabel.includes('ok')) { posX = 980; posY = 580; }
      else if (cleanLabel.includes('search')) { posX = 930; posY = 220; }

      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 290),
        timestamp,
        verified: true,
        verificationNotes: `Found button "${label}" with 98% confidence`,
        output: {
          success: true,
          found: true,
          label,
          position: { x: posX, y: posY },
          boundingBox: { x: posX - 45, y: posY - 18, width: 90, height: 36 },
          confidence: 0.98,
          message: `Button "${label}" located at screen pixel coordinates (${posX}, ${posY}).`,
        },
      };
    }

    case 'click_by_position': {
      const posX = Number(parameters.x ?? 960);
      const posY = Number(parameters.y ?? 540);
      const clickType = parameters.clickType || 'single';
      const button = parameters.button || 'left';

      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 120),
        timestamp,
        verified: true,
        verificationNotes: `Dispatched ${clickType} ${button}-click at (${posX}, ${posY})`,
        output: {
          success: true,
          position: { x: posX, y: posY },
          clickType,
          button,
          message: `Hardware mouse event: ${clickType} ${button}-click dispatched at screen pixel (${posX}, ${posY}).`,
        },
      };
    }

    case 'system_information':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 60),
        timestamp,
        verified: true,
        verificationNotes: `System hardware metrics sampled`,
        output: {
          success: true,
          os: 'Windows 11 Pro 64-bit (Build 22631.3880)',
          cpu: 'Intel Core i9-13900K @ 3.00GHz (24 Cores)',
          cpuUsage: '14.2%',
          ram: '32.0 GB Total (11.8 GB In Use, 36.8%)',
          storage: 'NVMe SSD 1TB (412 GB Free)',
          battery: 'AC Power Connected (100%)',
          network: 'Wi-Fi 6 (5 GHz, 866 Mbps, Latency: 12ms)',
        },
      };

    case 'volume_control':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 50),
        timestamp,
        verified: true,
        verificationNotes: `Master audio state set`,
        output: {
          success: true,
          action: parameters.action,
          currentVolume: parameters.level !== undefined ? parameters.level : 65,
          muted: parameters.action === 'mute',
        },
      };

    case 'play_media':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 90),
        timestamp,
        verified: true,
        verificationNotes: `Media playback command sent`,
        output: {
          success: true,
          command: parameters.command,
          activePlayer: 'Spotify Desktop',
          currentTrack: 'Synthetic Horizons - Lofi Chill Beats',
          state: parameters.command === 'pause' ? 'Paused' : 'Playing',
        },
      };

    case 'send_message':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 210),
        timestamp,
        verified: true,
        verificationNotes: `Message transmission confirmed by communication bridge`,
        output: {
          success: true,
          recipient: parameters.recipient,
          platform: parameters.platform || 'Email',
          messageId: `msg_${Date.now()}`,
          delivered: true,
        },
      };

    case 'read_messages':
      return {
        toolName,
        status: 'SUCCESS',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start + 180),
        timestamp,
        verified: true,
        verificationNotes: `Messages retrieved from inbox`,
        output: {
          success: true,
          platform: parameters.platform || 'All Clients',
          unreadCount: 2,
          messages: [
            { from: 'Alex Dev', text: 'Build #408 passed all tests on Windows PC.', time: '10m ago' },
            { from: 'Team Calendar', text: 'Daily Standup starts in 20 minutes.', time: '15m ago' },
          ],
        },
      };

    default:
      return {
        toolName,
        status: 'FAILED',
        bridgeUsed: false,
        executionTimeMs: Math.round(performance.now() - start),
        timestamp,
        verified: false,
        verificationNotes: `Unrecognized tool "${toolName}"`,
        error: `Tool "${toolName}" has no simulation handler registered.`,
        output: null,
      };
  }
}
