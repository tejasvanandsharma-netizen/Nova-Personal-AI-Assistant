import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  processAgentRequest,
  planTaskWithGemini,
  executeTaskStep,
  synthesizeTaskOutcome,
  detectLanguage,
  fastChatResponse,
  performGoogleSearchWithGrounding,
} from './src/server/agentPipeline';
import { loadMemory, saveMemory } from './src/server/memoryStore';
import { TOOLS_REGISTRY, executeSimulatedTool, evaluateSecurity } from './src/lib/toolsRegistry';
import { PYTHON_COMPANION_SCRIPT, WINDOWS_COMPANION_CONTRACT } from './src/lib/companionScript';
import { LocalBridgeConfig } from './src/types';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // --- API Endpoints ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      agent: 'NOVA',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // Tools catalog
  app.get('/api/tools', (req, res) => {
    res.json({
      count: TOOLS_REGISTRY.length,
      tools: TOOLS_REGISTRY,
    });
  });

  // Tool manual execution endpoint
  app.post('/api/tools/execute', async (req, res) => {
    try {
      const { toolName, parameters, bridgeConfig } = req.body;
      const sec = evaluateSecurity(toolName, parameters || {});

      if (sec.level === 'BLOCKED') {
        return res.status(403).json({
          success: false,
          error: sec.reason || 'Operation blocked by security policy.',
          permission: 'BLOCKED',
        });
      }

      // If simulated or bridge disconnected
      if (!bridgeConfig || bridgeConfig.simulationMode || !bridgeConfig.connected) {
        const result = executeSimulatedTool(toolName, parameters || {});
        return res.json({
          success: true,
          result,
          bridgeUsed: false,
        });
      }

      // Dispatch to local Windows bridge
      try {
        const bridgeUrl = `${(bridgeConfig.endpoint || 'http://127.0.0.1:8765').replace(/\/+$/, '')}/local-agent/execute`;
        const bridgeRes = await fetch(bridgeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: toolName, parameters: parameters || {} }),
        });
        const data = await bridgeRes.json();
        return res.json({
          success: true,
          result: {
            toolName,
            status: 'success',
            bridgeUsed: true,
            executionTimeMs: data.executionTimeMs || 100,
            timestamp: new Date().toISOString(),
            output: data.output || data,
          },
          bridgeUsed: true,
        });
      } catch (err: any) {
        // Fall back to simulation if bridge call fails
        const simResult = executeSimulatedTool(toolName, parameters || {});
        return res.json({
          success: true,
          result: simResult,
          bridgeUsed: false,
          warning: `Local bridge unreachable (${err.message}), returned simulation.`,
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Main Agent Endpoint
  app.post('/api/agent', async (req, res) => {
    try {
      const { message, history, bridgeConfig, confirmedStepId } = req.body;
      if (!message && !confirmedStepId) {
        return res.status(400).json({ error: 'Message or confirmed step is required.' });
      }

      const response = await processAgentRequest({
        message: message || '',
        history: history || [],
        bridgeConfig: bridgeConfig || {
          endpoint: 'http://127.0.0.1:8765',
          simulationMode: true,
          connected: false,
        },
        confirmedStepId,
      });

      res.json(response);
    } catch (err: any) {
      console.error('[NOVA Agent Error]:', err);
      res.status(500).json({
        error: 'Failed to process agent request.',
        details: err.message,
      });
    }
  });

  // Fast Conversational Chat & Immediate Task Acknowledgment Endpoint (<400ms)
  app.post('/api/agent/fast-chat', async (req, res) => {
    try {
      const { message, history, femaleMode } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const isFemale = femaleMode !== false; // Default true
      const result = await fastChatResponse(message, history || [], isFemale);
      res.json(result);
    } catch (err: any) {
      console.error('[NOVA Fast Chat Error]:', err);
      res.status(500).json({ error: 'Fast chat failed.', details: err.message });
    }
  });

  // Real-Time Google Search Grounding with Gemini 3.8 Flash
  app.post('/api/agent/google-search', async (req, res) => {
    try {
      const { query, language } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required.' });
      }

      const searchResult = await performGoogleSearchWithGrounding(query, language);
      res.json(searchResult);
    } catch (err: any) {
      console.error('[NOVA Google Search Route Error]:', err);
      res.status(500).json({ error: 'Google Search failed.', details: err.message });
    }
  });

  // Task Loop: 1. Reasoning & Planning Endpoint
  app.post('/api/agent/plan', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      const plan = await planTaskWithGemini(message);
      const language = detectLanguage(message);

      res.json({
        taskId: `task-${Date.now()}`,
        userPrompt: message,
        intent: plan.intent,
        reasoning: plan.reasoning,
        steps: plan.steps,
        language,
        plannerEngine: plan.plannerEngine,
      });
    } catch (err: any) {
      console.error('[NOVA Planning Error]:', err);
      res.status(500).json({ error: 'Planning failed.', details: err.message });
    }
  });

  // Task Loop: 2. Single Step Execution Endpoint with Validation, Timeout, Verification, & Retry
  app.post('/api/agent/execute-step', async (req, res) => {
    try {
      const { step, bridgeConfig } = req.body;
      if (!step || !step.tool) {
        return res.status(400).json({ error: 'Valid step object is required.' });
      }

      const config: LocalBridgeConfig = bridgeConfig || {
        endpoint: 'http://127.0.0.1:8765',
        simulationMode: true,
        connected: false,
      };

      const result = await executeTaskStep(step, config);
      res.json({
        stepId: step.id,
        tool: step.tool,
        result,
      });
    } catch (err: any) {
      console.error('[NOVA Step Execution Error]:', err);
      res.status(500).json({ error: 'Step execution failed.', details: err.message });
    }
  });

  // Task Loop: 3. Outcome Synthesis Endpoint based strictly on verified execution
  app.post('/api/agent/synthesize', async (req, res) => {
    try {
      const { userPrompt, intent, executedSteps, language } = req.body;
      const lang = language || detectLanguage(userPrompt || '');
      const summary = await synthesizeTaskOutcome(
        userPrompt || '',
        intent || 'Task execution',
        executedSteps || [],
        lang
      );

      res.json({
        assistantResponse: summary,
        language: lang,
      });
    } catch (err: any) {
      console.error('[NOVA Synthesis Error]:', err);
      res.status(500).json({ error: 'Synthesis failed.', details: err.message });
    }
  });

  // Memory endpoints
  app.get('/api/memory', (req, res) => {
    const memory = loadMemory();
    res.json(memory);
  });

  app.post('/api/memory', (req, res) => {
    try {
      const updated = saveMemory(req.body);
      res.json({ success: true, memory: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Local Windows Bridge status probe
  app.post('/api/local-agent/status', async (req, res) => {
    const { endpoint = 'http://127.0.0.1:8765' } = req.body;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const targetUrl = `${endpoint.replace(/\/+$/, '')}/local-agent/status`;
      const probeRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (probeRes.ok) {
        const data = await probeRes.json();
        return res.json({ connected: true, live: true, data });
      }
    } catch {
      // Connection failed (expected when companion daemon is not yet running on PC)
    }

    // Return disconnected status with mock fallback preview
    return res.json({
      connected: false,
      live: false,
      message: 'Companion daemon not detected on target port. Simulator mode active.',
      mockTelemetry: {
        platform: 'Windows 11 Pro',
        release: '10.0.22631',
        activeWindow: 'Visual Studio Code',
        cpuPercent: 12.4,
        memoryUsedPercent: 38.2,
      },
    });
  });

  // Local Windows Bridge Screenshot probe
  app.post('/api/local-agent/screenshot', async (req, res) => {
    const { endpoint = 'http://127.0.0.1:8765', simulationMode = true } = req.body;

    if (!simulationMode) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const targetUrl = `${endpoint.replace(/\/+$/, '')}/local-agent/screenshot`;
        const probeRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monitorIndex: 0 }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (probeRes.ok) {
          const data = await probeRes.json();
          return res.json(data);
        }
      } catch (err: any) {
        console.warn('[Screenshot Bridge Error]', err.message);
      }
    }

    // Generate simulated high-tech desktop HUD screenshot metadata
    res.json({
      success: true,
      simulated: true,
      resolution: '1920x1080',
      capturedAt: new Date().toISOString(),
      activeWindow: 'NOVA Agent Workspace & Windows Terminal',
      summary: 'Simulated desktop display capture. Windows companion daemon can stream live display frames.',
    });
  });

  // Companion script download / inspect
  app.get('/api/companion-script', (req, res) => {
    res.json({
      contract: WINDOWS_COMPANION_CONTRACT,
      pythonScript: PYTHON_COMPANION_SCRIPT,
      setupGuide: [
        '1. Install Python 3.10+ on your Windows PC.',
        '2. Run: pip install fastapi uvicorn pyautogui pygetwindow psutil pillow',
        '3. Save nova_windows_bridge.py and execute: python nova_windows_bridge.py',
        '4. In NOVA UI, click "Local Agent" indicator and verify CONNECTED status.',
      ],
    });
  });

  // --- Vite Middleware / Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NOVA Personal AI Desktop Assistant server active at http://localhost:${PORT}`);
  });
}

startServer();
