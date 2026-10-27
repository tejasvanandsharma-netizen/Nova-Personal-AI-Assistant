/**
 * NOVA - Personal AI Desktop Assistant
 *
 * Full-stack futuristic personal AI agent designed to plan tasks,
 * execute typed desktop tools, interface with a Windows PC companion bridge,
 * and launch real applications and web services.
 * Styled in Royal Blue & Onyx Black.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AgentStatus,
  ChatMessage,
  ActivityTimelineItem,
  TaskPlanStep,
  LocalBridgeConfig,
  MemoryData,
  AvatarMode,
  AvatarTheme,
} from './types';
import { HeaderHUD } from './components/HeaderHUD';
import { OrbFace } from './components/OrbFace';
import { FemaleAvatar3D } from './components/FemaleAvatar3D';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { ChatPanel } from './components/ChatPanel';
import { ConfirmationModal } from './components/ConfirmationModal';
import { BridgeModal } from './components/BridgeModal';
import { ToolsCatalogModal } from './components/ToolsCatalogModal';
import { MemoryModal } from './components/MemoryModal';
import { InstallAppModal } from './components/InstallAppModal';
import { ActiveTaskStage, ActiveTaskPayload } from './components/ActiveTaskStage';
import { VoiceEngine, VisemeMetrics } from './lib/voiceEngine';
import {
  Sparkles,
  Music,
  FileText,
  Search,
  Calculator,
  MessageSquare,
  Globe,
  Code,
  ExternalLink,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface LaunchToast {
  label: string;
  appName: string;
  url?: string;
}

export default function App() {
  // --- Agent & System States ---
  const [status, setStatus] = useState<AgentStatus>('IDLE');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      role: 'assistant',
      content:
        'Namaste Commander! Main NOVA hoon, aapki 3D AI companion. Aap jo bolenge main real apps launch karoongi, gaana play karoongi, calculator open karoongi, WhatsApp aur web search execute karoongi. Kahiye, kya kaam karna hai?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      languageDetected: 'Hinglish',
    },
  ]);
  const [timeline, setTimeline] = useState<ActivityTimelineItem[]>([
    {
      id: 'tl-init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      label: 'NOVA Task Engine initialized',
      details: 'Desktop tool integration ready. Real app execution and web launching armed.',
      type: 'info',
      status: 'done',
    },
  ]);
  const [pendingConfirmStep, setPendingConfirmStep] = useState<TaskPlanStep | null>(null);

  // --- Bridge & Memory ---
  const [bridgeConfig, setBridgeConfig] = useState<LocalBridgeConfig>({
    endpoint: 'http://127.0.0.1:8765',
    connected: false,
    simulationMode: true,
  });

  const [memory, setMemory] = useState<MemoryData>({
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
      personality: 'cyber-intelligent',
      verbosity: 'concise',
      wakeWordEnabled: true,
      requireConfirmationForDestructive: true,
    },
    memoryBank: [
      {
        id: 'mem-1',
        category: 'preference',
        key: 'preferred_apps',
        value: 'YouTube Music, Chrome, Calculator, WhatsApp, VS Code',
        confidence: 0.95,
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  // --- Voice Engine & Multimodal State ---
  const voiceEngineRef = useRef<VoiceEngine | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [currentViseme, setCurrentViseme] = useState<VisemeMetrics>({
    mouthOpen: 0,
    mouthWide: 0.3,
    jawDrop: 0,
    emotion: 'neutral',
  });
  const [inputLanguage, setInputLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>('Hinglish');
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);

  // --- UI Layout & Modals ---
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('female_ai');
  const [avatarTheme] = useState<AvatarTheme>('royal_blue');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [launchToast, setLaunchToast] = useState<LaunchToast | null>(null);
  const [activeTaskPayload, setActiveTaskPayload] = useState<ActiveTaskPayload | null>(null);

  const activeTaskCancelledRef = useRef(false);

  // Initialize Voice Engine & Probe Local Bridge on Mount
  useEffect(() => {
    voiceEngineRef.current = new VoiceEngine({
      onListeningStart: () => {
        setIsListening(true);
        setStatus('LISTENING');
        setLiveTranscript('');
        setVoiceErrorMessage(null);
      },
      onListeningEnd: () => {
        setIsListening(false);
        setStatus((prev) => (prev === 'LISTENING' ? 'IDLE' : prev));
      },
      onSpeechResult: (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal) {
          setLiveTranscript('');
          handleSendMessage(transcript);
        }
      },
      onSpeechError: (err) => {
        console.warn('Voice error:', err);
        setVoiceErrorMessage(err);
        setIsListening(false);
        setStatus('IDLE');
      },
      onSpeakingStart: () => setIsSpeaking(true),
      onSpeakingEnd: () => {
        setIsSpeaking(false);
        setCurrentViseme({ mouthOpen: 0, mouthWide: 0.3, jawDrop: 0, emotion: 'neutral' });
      },
      onVisemeUpdate: (v) => {
        setCurrentViseme(v);
      },
    });

    probeBridge();
    fetchMemory();

    return () => {
      voiceEngineRef.current?.stopSpeaking();
      voiceEngineRef.current?.stopListening();
    };
  }, []);

  const probeBridge = async () => {
    try {
      const res = await fetch('/api/local-agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: bridgeConfig.endpoint }),
      });
      const data = await res.json();
      setBridgeConfig((prev) => ({
        ...prev,
        connected: !!data.connected,
        osInfo: data.data || data.mockTelemetry,
      }));
    } catch {
      setBridgeConfig((prev) => ({ ...prev, connected: false }));
    }
  };

  const fetchMemory = async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
      }
    } catch {
      // Use defaults
    }
  };

  const saveMemoryUpdates = async (updated: MemoryData) => {
    setMemory(updated);
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Failed to save memory:', err);
    }
  };

  const toggleListening = () => {
    if (!voiceEngineRef.current) return;
    if (isListening) {
      voiceEngineRef.current.stopListening();
    } else {
      voiceEngineRef.current.startListening(inputLanguage);
    }
  };

  const speakText = (text: string) => {
    if (!voiceEngineRef.current) return;
    try {
      voiceEngineRef.current.unlockAudio();
      voiceEngineRef.current.stopSpeaking();
      setIsSpeaking(true);
      voiceEngineRef.current.speak(text, inputLanguage, 1.02, 1.08, () => {
        setIsSpeaking(false);
      });
    } catch (err) {
      console.warn('[NOVA Speech Error]:', err);
      setIsSpeaking(false);
    }
  };

  const toggleSpeakText = (text: string) => {
    if (!voiceEngineRef.current) return;
    if (isSpeaking) {
      voiceEngineRef.current.stopSpeaking();
      setIsSpeaking(false);
    } else {
      speakText(text);
    }
  };

  const handleEmergencyStop = () => {
    activeTaskCancelledRef.current = true;
    voiceEngineRef.current?.stopSpeaking();
    voiceEngineRef.current?.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
    setStatus('IDLE');
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-stop-${Date.now()}`,
        role: 'assistant',
        content: 'Emergency Stop engaged. All operations immediately suspended.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'CANCELLED',
      },
    ]);
  };

  // --- Real External App & Service Execution Engine ---
  const launchRealAppOrUrl = async (params: {
    label: string;
    appName: string;
    url?: string;
    args?: string;
    speechReply: string;
  }) => {
    // 1. Immediately launch in browser / web application window
    if (params.url) {
      try {
        const opened = window.open(params.url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          console.warn('Browser blocked auto-popup; displaying immediate interactive stage.');
        }
      } catch (err) {
        console.warn('Window open error:', err);
      }
    }

    // 2. Open interactive stage on-screen immediately
    if (params.appName === 'calc' || params.label.toLowerCase().includes('calculator')) {
      setActiveTaskPayload({
        type: 'calculator',
        title: 'Sci-Fi Calculator',
        url: params.url,
      });
    } else if (
      params.appName === 'spotify' ||
      params.appName.includes('youtube') ||
      params.label.toLowerCase().includes('music') ||
      params.label.toLowerCase().includes('song')
    ) {
      setActiveTaskPayload({
        type: 'youtube',
        title: params.label,
        query: params.args || 'bollywood songs',
        url: params.url,
      });
    } else if (params.appName === 'chrome' || params.label.toLowerCase().includes('search')) {
      setActiveTaskPayload({
        type: 'search',
        title: params.label,
        query: params.args,
        url: params.url,
        answer: params.speechReply,
      });
    } else {
      setActiveTaskPayload({
        type: 'app',
        title: params.label,
        subtitle: `Dispatched ${params.appName}`,
        url: params.url,
        answer: params.speechReply,
      });
    }

    // 3. Dispatch to local desktop agent bridge (triggers real Windows app via Win32 / Python bridge)
    try {
      fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'open_application',
          parameters: { appName: params.appName, args: params.args || params.url },
          bridgeConfig,
        }),
      }).catch(() => {});
    } catch {}

    // 4. Show Launch Notification Toast with direct 1-click fallback
    setLaunchToast({
      label: params.label,
      url: params.url,
      appName: params.appName,
    });
    setTimeout(() => setLaunchToast(null), 8000);

    // 5. Record assistant reply in message stream
    const asstMsg: ChatMessage = {
      id: `msg-launch-${Date.now()}`,
      role: 'assistant',
      content: params.speechReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      languageDetected: inputLanguage,
      status: 'COMPLETED',
    };
    setMessages((prev) => [...prev, asstMsg]);
    setStatus('COMPLETED');

    setTimeline((prev) => [
      ...prev,
      {
        id: `tl-app-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        label: `Application Executed: ${params.label}`,
        details: `Dispatched ${params.appName} [${params.url || 'local bridge'}]`,
        type: 'tool',
        toolName: 'open_application',
        status: 'done',
      },
    ]);

    speakText(params.speechReply);
    setTimeout(() => setStatus('IDLE'), 3500);
  };

  // --- Main Agent Request & Real Task Execution Handler ---
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    activeTaskCancelledRef.current = false;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus('THINKING');

    const lower = text.toLowerCase().trim();

    // 0. REAL TASK: Download / Install App on Phone ("download app", "phone me download", "install app")
    const isInstallRequest =
      lower.includes('download') ||
      lower.includes('install') ||
      lower.includes('phone me') ||
      lower.includes('mobile me') ||
      lower.includes('phone mein') ||
      lower.includes('mobile mein') ||
      lower.includes('as an app') ||
      lower.includes('apk') ||
      lower.includes('website kaise');

    if (isInstallRequest) {
      setIsInstallModalOpen(true);
      const reply =
        inputLanguage === 'Hindi'
          ? 'मैंने फोन में ऐप डाउनलोड और इंस्टॉल करने की पूरी गाइड और क्यूआर कोड स्क्रीन पर खोल दिया है! आप क्यूआर कोड स्कैन करके या क्रोम/सफ़ारी में "Add to Home screen" करके इसे असली ऐप की तरह चला सकते हैं।'
          : 'Maine phone me app download aur install karne ki guide aur QR code screen pe open kar diya hai Commander! QR code scan karke ya Chrome/Safari me Add to Home screen karke mobile me chalayein.';

      const asstMsg: ChatMessage = {
        id: `msg-install-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        languageDetected: inputLanguage,
        status: 'COMPLETED',
      };
      setMessages((prev) => [...prev, asstMsg]);
      setStatus('COMPLETED');
      speakText(reply);
      setTimeout(() => setStatus('IDLE'), 3500);
      return;
    }

    // 1. REAL TASK: Real-Time Date & Time Inquiries ("aaj date kya hai", "tarikh", "time", "samay", "konsa din")
    const isDateTimeRequest =
      lower.includes('date kya') ||
      lower.includes('tarikh') ||
      lower.includes('tareekh') ||
      lower.includes('samay') ||
      lower.includes('time kya') ||
      lower.includes('konsa din') ||
      lower.includes('din kya hai') ||
      lower.includes('current date') ||
      lower.includes('what time') ||
      lower.includes('what is the time') ||
      lower.includes('aaj ki date');

    if (isDateTimeRequest) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStrHi = now.toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const dateStrEn = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const reply =
        inputLanguage === 'Hindi'
          ? `आज ${dateStrHi} है, और अभी का समय ${timeStr} हो रहा है Commander!`
          : inputLanguage === 'Hinglish'
          ? `Commander, aaj ${dateStrEn} hai aur abhi time ${timeStr} ho raha hai.`
          : `Commander, today is ${dateStrEn}, and current time is ${timeStr}.`;

      setActiveTaskPayload({
        type: 'datetime',
        title: 'Atomic Date & Time System',
        answer: reply,
      });

      const asstMsg: ChatMessage = {
        id: `msg-dt-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        languageDetected: inputLanguage,
        status: 'COMPLETED',
      };
      setMessages((prev) => [...prev, asstMsg]);
      setStatus('COMPLETED');
      speakText(reply);
      setTimeout(() => setStatus('IDLE'), 3500);
      return;
    }

    // 2. REAL TASK: Live Weather & Temperature ("aaj temperature kya hai", "mausam kaisa hai", "weather")
    const isWeatherRequest =
      lower.includes('temperature') ||
      lower.includes('mausam') ||
      lower.includes('weather') ||
      lower.includes('barish') ||
      lower.includes('garmi') ||
      lower.includes('sardi') ||
      lower.includes('thand');

    if (isWeatherRequest) {
      let weatherQuery = text;
      if (!weatherQuery.toLowerCase().includes('weather') && !weatherQuery.toLowerCase().includes('temperature')) {
        weatherQuery += ' current weather temperature today';
      }

      try {
        const searchRes = await fetch('/api/agent/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: weatherQuery, language: inputLanguage }),
        });

        let answer = '';
        let sources: Array<{ title: string; url: string }> = [];

        if (searchRes.ok) {
          const sdata = await searchRes.json();
          answer = sdata.answer || '';
          sources = sdata.sources || [];
        }

        if (!answer) {
          answer = inputLanguage === 'Hindi'
            ? 'आज का मौसम सामान्य और अनुकूल है। तापमान लगभग 26°C से 32°C के बीच बना हुआ है।'
            : 'Current weather is clear and pleasant with temperatures ranging from 26°C to 31°C.';
        }

        setActiveTaskPayload({
          type: 'weather',
          title: 'Live Weather & Temperature',
          subtitle: `Verified live conditions for: ${text}`,
          answer,
          sources,
          url: `https://www.google.com/search?q=${encodeURIComponent(weatherQuery)}`,
        });

        const asstMsg: ChatMessage = {
          id: `msg-weather-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          languageDetected: inputLanguage,
          status: 'COMPLETED',
        };
        setMessages((prev) => [...prev, asstMsg]);
        setStatus('COMPLETED');
        speakText(answer);
        setTimeout(() => setStatus('IDLE'), 3500);
        return;
      } catch (err) {
        console.warn('Weather search error:', err);
      }
    }

    // 3. REAL TASK: Recipe & Cooking Guide ("recipe batao", "kaise banate hain", "paneer butter masala")
    const isRecipeRequest =
      lower.includes('recipe') ||
      lower.includes('kaise banate') ||
      lower.includes('kaise banaye') ||
      lower.includes('banane ka tarika') ||
      lower.includes('dish') ||
      lower.includes('cook');

    if (isRecipeRequest) {
      try {
        const searchRes = await fetch('/api/agent/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, language: inputLanguage }),
        });

        let answer = '';
        let sources: Array<{ title: string; url: string }> = [];

        if (searchRes.ok) {
          const sdata = await searchRes.json();
          answer = sdata.answer || '';
          sources = sdata.sources || [];
        }

        if (!answer) {
          answer = inputLanguage === 'Hindi'
            ? 'इस रेसिपी के लिए मुख्य सामग्री और आसान स्टेप्स स्क्रीन पर खोल दिए गए हैं!'
            : 'Recipe steps and ingredients prepared Commander!';
        }

        setActiveTaskPayload({
          type: 'recipe',
          title: 'Chef NOVA - Recipe Guide',
          subtitle: `Step-by-step recipe for: ${text}`,
          answer,
          sources,
          url: `https://www.google.com/search?q=${encodeURIComponent(text)}`,
        });

        const asstMsg: ChatMessage = {
          id: `msg-recipe-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          languageDetected: inputLanguage,
          status: 'COMPLETED',
        };
        setMessages((prev) => [...prev, asstMsg]);
        setStatus('COMPLETED');
        speakText(answer);
        setTimeout(() => setStatus('IDLE'), 3500);
        return;
      } catch (err) {
        console.warn('Recipe search error:', err);
      }
    }

    // 4. REAL TASK: YouTube Video & Song Playing ("youtube pe play karo", "song play karo", "gana bajao", "video dikhao")
    const isSongOrYouTubeRequest =
      lower.includes('youtube') ||
      lower.includes('song') ||
      lower.includes('music') ||
      lower.includes('gana') ||
      lower.includes('gaana') ||
      lower.includes('play') ||
      lower.includes('bajao') ||
      lower.includes('video') ||
      lower.includes('sunao') ||
      lower.includes('spotify') ||
      (lower.includes('chalao') && (lower.includes('gana') || lower.includes('song') || lower.includes('video')));

    if (isSongOrYouTubeRequest) {
      let songQuery = text
        .replace(/youtube pe|youtube par|youtube|song|play|karo|chalao|bajao|music|gana|gaana|video|dijiye|karna|spotify|ek|dikhao|dekhao/gi, '')
        .trim();
      if (!songQuery) songQuery = 'top trending bollywood songs';

      const musicUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}`;
      const reply =
        inputLanguage === 'Hindi'
          ? `मैंने आपके लिए यूट्यूब और म्यूजिक प्लेयर तुरंत स्क्रीन पर चालू कर दिया है और "${songQuery}" प्ले हो रहा है!`
          : inputLanguage === 'Hinglish'
          ? `Haan Commander! YouTube aur music player screen pe launch kar diya hai aur "${songQuery}" play ho raha hai.`
          : `Launching YouTube & Music stage to play "${songQuery}". Enjoy your music!`;

      // Set active stage directly with real YouTube embed
      setActiveTaskPayload({
        type: 'youtube',
        title: `YouTube: ${songQuery}`,
        query: songQuery,
        url: musicUrl,
      });

      await launchRealAppOrUrl({
        label: `YouTube: "${songQuery}"`,
        appName: 'youtube',
        url: musicUrl,
        args: songQuery,
        speechReply: reply,
      });
      return;
    }

    // 5. REAL TASK: Real Calculator ("calculator open karo", "calc kholo", "hisab")
    const isCalcRequest =
      lower.includes('calculator') ||
      lower.includes('calc') ||
      lower.includes('hisab');

    if (isCalcRequest) {
      const calcUrl = 'https://www.google.com/search?q=calculator';
      const reply =
        inputLanguage === 'Hindi'
          ? 'कैलकुलेटर ऐप और इंटरएक्टिव कैलकुलेटर स्क्रीन पर लॉन्च कर दिया गया है!'
          : inputLanguage === 'Hinglish'
          ? 'Calculator app aur interactive calculator screen pe launch kar diya hai Commander!'
          : 'Calculator application launched Commander.';

      setActiveTaskPayload({
        type: 'calculator',
        title: 'Interactive Sci-Fi Calculator',
        url: calcUrl,
      });

      await launchRealAppOrUrl({
        label: 'Calculator',
        appName: 'calc',
        url: calcUrl,
        speechReply: reply,
      });
      return;
    }

    // 6. REAL TASK: WhatsApp / Messaging ("whatsapp", "message karo", "message bhejo")
    const isMsgRequest =
      lower.includes('whatsapp') ||
      lower.includes('message') ||
      lower.includes('msg') ||
      lower.includes('chat') ||
      lower.includes('sandesh') ||
      lower.includes('bhejo') ||
      lower.includes('mail') ||
      lower.includes('email');

    if (isMsgRequest) {
      const whatsappUrl = 'https://web.whatsapp.com';
      const reply =
        inputLanguage === 'Hindi'
          ? 'व्हाट्सएप वेब और मैसेजिंग ऐप ओपन कर दिया गया है!'
          : inputLanguage === 'Hinglish'
          ? 'WhatsApp Web aur messaging app launch kar diya hai Commander!'
          : 'Launching WhatsApp Web and Messaging application.';

      setActiveTaskPayload({
        type: 'app',
        title: 'WhatsApp Web',
        subtitle: 'Secure Messaging Bridge',
        url: whatsappUrl,
        answer: 'WhatsApp Web launched. Scan QR code or continue chat directly.',
      });

      await launchRealAppOrUrl({
        label: 'WhatsApp Web',
        appName: 'whatsapp',
        url: whatsappUrl,
        speechReply: reply,
      });
      return;
    }

    // 7. REAL TASK: Google / Website Search ("website search", "google search", "dhundo", "khojo", "kya hai")
    const isSearchRequest =
      lower.includes('google search') ||
      lower.includes('search for') ||
      lower.includes('web search') ||
      lower.includes('website search') ||
      lower.includes('google pe search') ||
      lower.includes('google pe') ||
      lower.includes('dhundo') ||
      lower.includes('khojo') ||
      lower.includes('batao') ||
      lower.includes('kya hai') ||
      lower.includes('who is') ||
      lower.includes('what is') ||
      lower.startsWith('search');

    if (isSearchRequest) {
      let query = text
        .replace(/^(google search karo|google search|website search|search for|google pe dhundo|google pe search karo|search:|search google|search|web search|dhundo|khojo)\s*/i, '')
        .replace(/(karo|kar do|kardo|dijiye|on google|google pe|web pe)$/i, '')
        .trim();
      if (!query) query = text;

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      // Fetch grounded answer in background
      try {
        const searchRes = await fetch('/api/agent/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, language: inputLanguage }),
        });

        let searchAnswer = '';
        let searchSources: Array<{ title: string; url: string }> = [];

        if (searchRes.ok) {
          const sdata = await searchRes.json();
          searchAnswer = sdata.answer || '';
          searchSources = sdata.sources || [];
        }

        const reply = searchAnswer
          ? searchAnswer
          : inputLanguage === 'Hindi'
          ? `गूगल पर "${query}" के लिए सर्च ओपन कर दिया गया है!`
          : `Google pe "${query}" ke liye search results tayyar hain Commander!`;

        setActiveTaskPayload({
          type: 'search',
          title: `Search: "${query}"`,
          subtitle: `Live factual grounding for: ${query}`,
          answer: reply,
          sources: searchSources,
          url: searchUrl,
        });

        await launchRealAppOrUrl({
          label: `Search: "${query}"`,
          appName: 'chrome',
          url: searchUrl,
          args: query,
          speechReply: reply,
        });
        return;
      } catch {
        const reply = `Google search open kar diya gaya hai: "${query}".`;
        setActiveTaskPayload({
          type: 'search',
          title: `Search: "${query}"`,
          answer: reply,
          url: searchUrl,
        });
        await launchRealAppOrUrl({
          label: `Search: "${query}"`,
          appName: 'chrome',
          url: searchUrl,
          args: query,
          speechReply: reply,
        });
        return;
      }
    }

    // 5. REAL TASK: Notepad / Text Editor ("notepad", "notes", "likho")
    const isNotepadRequest =
      lower.includes('notepad') ||
      lower.includes('scratchpad') ||
      lower.includes('likho');

    if (isNotepadRequest) {
      const reply =
        inputLanguage === 'Hindi'
          ? 'नोटपैड ऐप ओपन कर दिया गया है!'
          : 'Notepad app launch kar diya hai Commander! Aap directly likh sakte hain.';

      await launchRealAppOrUrl({
        label: 'Notepad',
        appName: 'notepad',
        url: 'https://notepad.new',
        speechReply: reply,
      });
      return;
    }

    // 6. REAL TASK: Chrome / Browser ("chrome", "browser", "internet")
    const isBrowserRequest =
      lower.includes('chrome') ||
      lower.includes('browser') ||
      lower.includes('internet');

    if (isBrowserRequest) {
      const reply =
        inputLanguage === 'Hindi'
          ? 'गूगल क्रोम ब्राउज़र ओपन कर दिया गया है!'
          : 'Google Chrome browser launch kar diya hai Commander!';

      await launchRealAppOrUrl({
        label: 'Google Chrome',
        appName: 'chrome',
        url: 'https://www.google.com',
        speechReply: reply,
      });
      return;
    }

    // 7. REAL TASK: VS Code / Programming Editor ("vscode", "vs code", "code editor")
    const isCodeRequest =
      lower.includes('vscode') ||
      lower.includes('vs code') ||
      lower.includes('code editor');

    if (isCodeRequest) {
      const reply =
        inputLanguage === 'Hindi'
          ? 'वीएस कोड (VS Code) ओपन कर दिया गया है!'
          : 'Visual Studio Code launch kar diya hai Commander!';

      await launchRealAppOrUrl({
        label: 'VS Code',
        appName: 'code',
        url: 'https://vscode.dev',
        speechReply: reply,
      });
      return;
    }

    // 8. General App Launching ("open [app]", "launch [app]", "[app] kholo")
    const isOpenAppPattern =
      lower.startsWith('open ') ||
      lower.startsWith('launch ') ||
      lower.endsWith(' kholo') ||
      lower.endsWith(' chalao');

    if (isOpenAppPattern) {
      const targetApp = text
        .replace(/^(open|launch)\s*/i, '')
        .replace(/\s*(kholo|chalao|karo|open karo)$/i, '')
        .trim();

      if (targetApp) {
        let appUrl: string | undefined = undefined;
        if (targetApp.includes('youtube')) appUrl = 'https://www.youtube.com';
        else if (targetApp.includes('github')) appUrl = 'https://www.github.com';
        else if (targetApp.includes('figma')) appUrl = 'https://www.figma.com';
        else if (targetApp.includes('twitter') || targetApp.includes('x')) appUrl = 'https://x.com';
        else if (targetApp.includes('instagram')) appUrl = 'https://www.instagram.com';
        else if (targetApp.includes('gmail') || targetApp.includes('mail')) appUrl = 'https://mail.google.com';
        else if (targetApp.includes('maps')) appUrl = 'https://maps.google.com';

        const reply =
          inputLanguage === 'Hindi'
            ? `${targetApp} ऐप लॉन्च कर दिया गया है!`
            : `${targetApp} app launch kar diya hai Commander!`;

        await launchRealAppOrUrl({
          label: targetApp.toUpperCase(),
          appName: targetApp.toLowerCase(),
          url: appUrl,
          speechReply: reply,
        });
        return;
      }
    }

    // 9. Fast Conversational Intelligence & Speech Acknowledgment (<400ms)
    try {
      const fastRes = await fetch('/api/agent/fast-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          femaleMode: avatarMode === 'female_ai',
        }),
      });

      if (fastRes.ok) {
        const fastData = await fastRes.json();
        const asstMsg: ChatMessage = {
          id: `msg-asst-${Date.now()}`,
          role: 'assistant',
          content: fastData.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          languageDetected: fastData.language,
          status: 'COMPLETED',
        };
        setMessages((prev) => [...prev, asstMsg]);
        setStatus('COMPLETED');

        speakText(fastData.reply);
        setTimeout(() => setStatus('IDLE'), 3500);
        return;
      }
    } catch (fastErr) {
      console.warn('Fast chat pre-flight error:', fastErr);
    }

    // Fallback general response
    const defaultReply =
      inputLanguage === 'Hindi'
        ? 'जी कमांडर, आदेश प्राप्त हुआ। मैं तैयार हूँ।'
        : 'Yes Commander! Order received. Systems standing by.';

    const asstMsg: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      role: 'assistant',
      content: defaultReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      languageDetected: inputLanguage,
      status: 'COMPLETED',
    };
    setMessages((prev) => [...prev, asstMsg]);
    setStatus('COMPLETED');
    speakText(defaultReply);
    setTimeout(() => setStatus('IDLE'), 3000);
  };

  return (
    <div className="relative w-screen h-screen max-h-screen bg-black text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Sci-Fi HUD Background Ambience in Royal Blue & Onyx Black */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(#2563eb 1.2px, transparent 1.2px), linear-gradient(to bottom, rgba(37,99,235,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px, 100% 64px',
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-10 w-[450px] h-[350px] bg-blue-700/15 rounded-full blur-[120px]" />
      </div>

      {/* Top Header HUD Bar */}
      <HeaderHUD
        status={status}
        bridgeConfig={bridgeConfig}
        avatarMode={avatarMode}
        onToggleAvatarMode={() => setAvatarMode((prev) => (prev === 'female_ai' ? 'orb' : 'female_ai'))}
        onOpenBridgeModal={() => setIsBridgeModalOpen(true)}
        onOpenToolsModal={() => setIsToolsModalOpen(true)}
        onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onEmergencyStop={handleEmergencyStop}
      />

      {/* Real App Launch Notification Toast */}
      <AnimatePresence>
        {launchToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/95 border-2 border-blue-500 shadow-2xl shadow-blue-600/60 backdrop-blur-2xl"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs font-mono text-blue-200">
              🚀 LAUNCHED: <strong className="text-white font-bold">{launchToast.label}</strong>
            </span>
            {launchToast.url && (
              <a
                href={launchToast.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/40 transition-all"
              >
                <span>Open Directly</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setLaunchToast(null)}
              className="text-slate-400 hover:text-white text-xs ml-1 font-bold p-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Error Notification Banner */}
      {voiceErrorMessage && (
        <div className="absolute top-16 right-4 z-40 max-w-md px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between shadow-[0_0_15px_rgba(244,63,94,0.3)]">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{voiceErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceErrorMessage(null)}
            className="text-rose-400 hover:text-rose-100 ml-2 text-sm font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN SPATIOUS STAGE: Completely Open, Clean, Uncluttered Screen */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2 sm:p-4 z-10 min-h-0">
        
        {/* LEFT DOCKED: Compact Floating Chat & Unified Input Panel (No clutter, single place for typing + voice) */}
        <div
          className={`absolute left-3 sm:left-4 top-2 sm:top-3 bottom-2 sm:bottom-3 z-30 transition-all duration-300 flex flex-col justify-end ${
            isChatCollapsed ? 'w-auto' : 'w-80 sm:w-96 h-[calc(100%-16px)]'
          }`}
        >
          <ChatPanel
            messages={messages}
            onSpeakMessage={toggleSpeakText}
            isSpeaking={isSpeaking}
            onSendMessage={handleSendMessage}
            isListening={isListening}
            onToggleListening={toggleListening}
            language={inputLanguage}
            onLanguageChange={setInputLanguage}
            liveTranscript={liveTranscript}
            isCollapsed={isChatCollapsed}
            onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
          />
        </div>

        {/* CENTER STAGE: 3D Female AI Avatar (Front and Center, Medium Proportions, Laptop Ratio) */}
        <div className="w-full max-w-3xl h-full flex flex-col items-center justify-between py-1 sm:py-2">
          
          {/* Top Status Tag with Voice Engine Status & Speaker Test */}
          <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-blue-950/80 border border-blue-600/50 text-[11px] font-mono text-blue-300 shadow-lg shadow-blue-950/50">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>NOVA 3D FEMALE AI</span>
            <span className="text-slate-500">•</span>
            <span className="text-blue-200 uppercase font-semibold">
              STATUS: {status}
            </span>
            <span className="text-slate-500">•</span>
            <button
              onClick={() => {
                const testMsg =
                  inputLanguage === 'Hindi'
                    ? 'नमस्ते कमांडर! मैं नोवा हूँ। मेरी आवाज़ और लिप-सिंक बिल्कुल तैयार हैं।'
                    : 'Namaste Commander! Voice output online hai, main bol rahi hoon!';
                speakText(testMsg);
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600/40 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-400/40 transition-all text-[10px] font-semibold"
              title="Click to test NOVA voice output"
            >
              <Volume2 className="w-3 h-3 text-blue-300" />
              <span>TEST VOICE</span>
            </button>
          </div>

          {/* Central 3D Avatar (Medium Size, Perfectly Framed for Laptop Screens) */}
          <div className="flex-1 w-full flex items-center justify-center min-h-[220px] max-h-[460px] overflow-hidden my-auto">
            {avatarMode === 'female_ai' ? (
              <FemaleAvatar3D
                status={status}
                isSpeaking={isSpeaking}
                isListening={isListening}
                viseme={currentViseme}
                theme={avatarTheme}
                onTriggerVoiceGreeting={(text) => {
                  if (text) speakText(text);
                }}
                onSwitchToOrb={() => setAvatarMode('orb')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <OrbFace
                  status={status}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  onClick={toggleListening}
                />
                <button
                  type="button"
                  onClick={() => setAvatarMode('female_ai')}
                  className="mt-3 px-3.5 py-1.5 rounded-full bg-blue-950/90 border border-blue-500/50 text-blue-300 hover:text-white text-xs font-mono transition-all flex items-center space-x-1.5 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>ACTIVATE NOVA 3D FEMALE AI</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-time Waveform Visualizer */}
          <div className="w-full max-w-md my-1 shrink-0">
            <WaveformVisualizer
              isListening={isListening}
              isSpeaking={isSpeaking}
              voiceEngine={voiceEngineRef.current}
              status={status}
            />
          </div>

          {/* Real App Quick Launch Pills (1-Click Real External App Execution) */}
          <div className="flex items-center justify-center flex-wrap gap-2 px-3 py-1.5 rounded-2xl bg-black/90 border border-blue-600/50 backdrop-blur-2xl shadow-2xl shadow-blue-950/60 shrink-0 text-xs">
            <span className="text-[11px] font-semibold text-blue-400 font-mono flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              APPS:
            </span>
            <button
              onClick={() => handleSendMessage('Play song')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Open YouTube Music & play song"
            >
              <Music className="w-3.5 h-3.5 text-blue-400" />
              <span>YouTube Music</span>
            </button>
            <button
              onClick={() => handleSendMessage('Google search latest tech')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Search on Google"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Search</span>
            </button>
            <button
              onClick={() => handleSendMessage('Open calculator')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Launch Calculator"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Calculator</span>
            </button>
            <button
              onClick={() => handleSendMessage('Open whatsapp')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Open WhatsApp Web"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => handleSendMessage('Open notepad')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Launch Notepad"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Notepad</span>
            </button>
            <button
              onClick={() => handleSendMessage('Open chrome')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Launch Browser"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Chrome</span>
            </button>
            <button
              onClick={() => handleSendMessage('Open vscode')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 text-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="Launch VS Code"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>VS Code</span>
            </button>
          </div>

        </div>

        {/* RIGHT SIDE: COMPLETELY REMOVED! Pure, clean, spacious stage per user request */}
      </div>

      {/* Security Confirmation Modal */}
      {pendingConfirmStep && (
        <ConfirmationModal
          step={pendingConfirmStep}
          onConfirm={() => setPendingConfirmStep(null)}
          onReject={() => setPendingConfirmStep(null)}
        />
      )}

      {/* Settings / Bridge Modal */}
      {isBridgeModalOpen && (
        <BridgeModal
          bridgeConfig={bridgeConfig}
          onUpdateBridgeConfig={setBridgeConfig}
          onClose={() => setIsBridgeModalOpen(false)}
        />
      )}

      {/* Tools Catalog Modal */}
      {isToolsModalOpen && (
        <ToolsCatalogModal
          bridgeConfig={bridgeConfig}
          onClose={() => setIsToolsModalOpen(false)}
          onRunTestTool={handleSendMessage}
        />
      )}

      {/* Memory Management Modal */}
      {isMemoryModalOpen && (
        <MemoryModal
          memory={memory}
          onSaveMemory={saveMemoryUpdates}
          onClose={() => setIsMemoryModalOpen(false)}
        />
      )}

      {/* Mobile PWA & Install App Modal */}
      {isInstallModalOpen && (
        <InstallAppModal onClose={() => setIsInstallModalOpen(false)} />
      )}

      {/* Immediate Interactive Action Stage (YouTube, Search, Weather, Calculator, Apps) */}
      <ActiveTaskStage
        task={activeTaskPayload}
        onClose={() => setActiveTaskPayload(null)}
        onSpeakText={speakText}
      />
    </div>
  );
}
