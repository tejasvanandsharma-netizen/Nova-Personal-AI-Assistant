/**
 * NOVA Modular Voice Engine
 *
 * Handles speech recognition (SpeechRecognition / webkitSpeechRecognition)
 * and natural female speech synthesis (window.speechSynthesis) with audio hookups,
 * real-time viseme lip-sync calculations, and quick-listening auto-silence detection.
 */

export interface VisemeMetrics {
  mouthOpen: number;  // 0 (closed) to 1 (wide open)
  mouthWide: number;  // 0 (neutral) to 1 (wide smile/EE)
  jawDrop: number;    // 0 (closed) to 1 (open jaw)
  emotion: string;    // 'happy' | 'neutral' | 'curious' | 'surprised'
}

export interface VoiceEngineCallbacks {
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onSpeechResult?: (transcript: string, isFinal: boolean) => void;
  onSpeechError?: (error: string) => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onVisemeUpdate?: (viseme: VisemeMetrics) => void;
}

export class VoiceEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldBeListening: boolean = false;
  private isSpeaking: boolean = false;
  private callbacks: VoiceEngineCallbacks = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private silenceTimer: any = null;
  private visemeTimer: any = null;
  private lastTranscript: string = '';
  private currentViseme: VisemeMetrics = { mouthOpen: 0, mouthWide: 0.3, jawDrop: 0, emotion: 'neutral' };
  private activeLanguage: string = 'en-IN';
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor(callbacks: VoiceEngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.initRecognition();
    this.initVoices();
  }

  private continuousMode: boolean = true;
  private isProcessingCommand: boolean = false;

  public setContinuousMode(enabled: boolean) {
    this.continuousMode = enabled;
  }

  public getContinuousMode(): boolean {
    return this.continuousMode;
  }

  private initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      this.cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
    } catch (e) {
      console.warn('[NOVA Voice] Voice initialization:', e);
    }
  }

  public unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (err) {
      console.warn('[NOVA Voice] unlockAudio:', err);
    }
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.activeLanguage;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.lastTranscript = '';
          this.callbacks.onListeningStart?.();
        };

        this.recognition.onresult = (event: any) => {
          // If assistant is currently speaking or processing, discard self-echo
          if (this.isSpeaking) return;

          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript + ' ';
            } else {
              interimTranscript += res[0].transcript;
            }
          }
          const text = (finalTranscript + interimTranscript).trim();
          if (text) {
            this.lastTranscript = text;
            this.callbacks.onSpeechResult?.(text, false);

            // Auto-send after 1500ms of silence
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
              if (this.shouldBeListening && this.lastTranscript) {
                const completedText = this.lastTranscript;
                this.lastTranscript = '';
                
                // If not continuous mode, stop listening
                if (!this.continuousMode) {
                  this.stopListening();
                }
                
                this.callbacks.onSpeechResult?.(completedText, true);
              }
            }, 1500);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('[NOVA Voice] Recognition status/error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            this.shouldBeListening = false;
            this.callbacks.onSpeechError?.(
              'Microphone permission blocked. Please enable microphone permissions in your mobile/browser address bar.'
            );
            this.stopListening();
          } else if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
            // Very common on Android/iOS mobile when user pauses or network has slight latency.
            // DO NOT stop listening! The onend handler will seamlessly restart recognition.
            return;
          } else if (event.error === 'aborted') {
            return;
          }
        };

        this.recognition.onend = () => {
          // If we should be listening and not speaking, restart immediately (keeps mic alive on phones)
          if (this.shouldBeListening && !this.isSpeaking) {
            setTimeout(() => {
              if (this.shouldBeListening && !this.isSpeaking && this.recognition) {
                try {
                  this.recognition.start();
                  return;
                } catch {
                  // If starting failed (e.g. already started), retry shortly
                  setTimeout(() => {
                    if (this.shouldBeListening && !this.isSpeaking && this.recognition) {
                      try { this.recognition.start(); } catch {}
                    }
                  }, 300);
                }
              }
            }, 100);
            return;
          }

          // If assistant is speaking, keep shouldBeListening true so it resumes when speech ends
          if (this.shouldBeListening && this.isSpeaking) {
            return;
          }

          this.isListening = false;
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
          this.callbacks.onListeningEnd?.();
        };
      } catch (e) {
        console.warn('[NOVA Voice] SpeechRecognition init failed:', e);
      }
    }
  }

  public async startListening(lang: string = 'Hinglish'): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.callbacks.onSpeechError?.(
        'Speech recognition is not supported in this browser. Please use Google Chrome or mobile Chrome, or type your message in the chat box.'
      );
      return false;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    // Stop speaking immediately when user speaks (instant barge-in)
    this.stopSpeaking();
    this.unlockAudio();

    // Map user language to proper BCP 47 tag
    let langTag = 'en-IN'; // Default Indian English (excels at Hinglish, Hindi phonetics & English)
    if (lang === 'Hindi' || lang === 'hi' || lang === 'hi-IN') {
      langTag = 'hi-IN';
    } else if (lang === 'English') {
      langTag = 'en-US';
    } else if (lang === 'Hinglish') {
      langTag = 'en-IN';
    }

    this.activeLanguage = langTag;
    this.shouldBeListening = true;

    try {
      this.recognition.lang = langTag;
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Recognition was already running or in starting state
        this.isListening = true;
        return true;
      }
      console.warn('[NOVA Voice] Start listening notice:', err);
      return false;
    }
  }

  public resumeListeningAfterSpeech() {
    if (!this.shouldBeListening || !this.recognition) return;
    setTimeout(() => {
      if (this.shouldBeListening && !this.isSpeaking) {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch {}
      }
    }, 200);
  }

  public pauseListeningForSpeech() {
    if (!this.recognition) return;
    try {
      this.recognition.abort();
    } catch {}
  }

  public stopListening() {
    this.shouldBeListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {}
    }
    this.isListening = false;
    this.callbacks.onListeningEnd?.();
  }

  public speak(
    text: string,
    langOrRate?: string | number,
    rateOrPitch?: number,
    pitchOrEnd?: number | (() => void),
    onEndCallback?: () => void
  ) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[NOVA Voice] SpeechSynthesis not available in this environment.');
      return;
    }

    // Determine language, rate and pitch robustly
    let language = 'Hinglish';
    let rate = 1.0;
    let pitch = 1.08;
    let endCallback = onEndCallback;

    if (typeof langOrRate === 'string') {
      language = langOrRate;
      if (typeof rateOrPitch === 'number') rate = rateOrPitch;
      if (typeof pitchOrEnd === 'number') pitch = pitchOrEnd;
      else if (typeof pitchOrEnd === 'function') endCallback = pitchOrEnd;
    } else if (typeof langOrRate === 'number') {
      rate = langOrRate;
      if (typeof rateOrPitch === 'number') pitch = rateOrPitch;
      if (typeof pitchOrEnd === 'function') endCallback = pitchOrEnd;
    }

    // Ensure rate and pitch are valid finite numbers
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) rate = 1.0;
    if (typeof pitch !== 'number' || isNaN(pitch) || pitch <= 0) pitch = 1.08;

    // Cancel any ongoing speech
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
    } catch (e) {}

    // Strip markdown formatting symbols and emojis for clean speech
    const cleanText = text
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/Step \d+:\s*/gi, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.min(Math.max(rate, 0.7), 1.5);
    utterance.pitch = Math.min(Math.max(pitch, 0.6), 1.6);
    utterance.volume = 1.0;

    // Language detection
    const isHindiText =
      language === 'Hindi' ||
      /[\u0900-\u097F]/.test(cleanText) ||
      /\b(main|hoon|karti|karein|samajh|kholo|chalao|kripya|namaste|kijiye|aapke|diya|hai)\b/i.test(cleanText);

    let langTag = 'en-IN';
    if (isHindiText) {
      langTag = 'hi-IN';
    } else if (language === 'English') {
      langTag = 'en-US';
    }
    utterance.lang = langTag;

    // Pick top female voices from cache or available voices
    const voices =
      this.cachedVoices && this.cachedVoices.length > 0
        ? this.cachedVoices
        : window.speechSynthesis.getVoices();

    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (isHindiText) {
      selectedVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('hi') &&
            (v.name.toLowerCase().includes('female') ||
              v.name.includes('Kalpana') ||
              v.name.includes('Heera') ||
              v.name.includes('Swara') ||
              v.name.includes('Geeta') ||
              v.name.includes('Google हिन्दी'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
        voices.find((v) => v.lang.toLowerCase().includes('en-in') && v.name.toLowerCase().includes('female')) ||
        voices.find((v) => v.lang.toLowerCase().includes('en-in'));
    }

    if (!selectedVoice) {
      // Find highest quality female voice or Indian English voice
      selectedVoice = voices.find((v) => {
        const name = v.name.toLowerCase();
        return (
          (name.includes('female') ||
            name.includes('samantha') ||
            name.includes('victoria') ||
            name.includes('karen') ||
            name.includes('zira') ||
            name.includes('jenny') ||
            name.includes('aria') ||
            name.includes('swara') ||
            name.includes('natural')) &&
          (v.lang.startsWith('en') || v.lang.startsWith('hi'))
        );
      });
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Detect speech sentiment emotion
    const lower = cleanText.toLowerCase();
    let speechEmotion = 'neutral';
    if (
      lower.includes('sorry') ||
      lower.includes('error') ||
      lower.includes('failed') ||
      lower.includes('problem') ||
      lower.includes('danger') ||
      lower.includes('warning') ||
      lower.includes('blocked') ||
      lower.includes('unable') ||
      lower.includes('maaf')
    ) {
      speechEmotion = 'concerned';
    } else if (
      lower.includes('ready') ||
      lower.includes('done') ||
      lower.includes('great') ||
      lower.includes('khol diya') ||
      lower.includes('haanji') ||
      lower.includes('khushi') ||
      lower.includes('success') ||
      lower.includes('sure') ||
      lower.includes('bilkul') ||
      lower.includes('badhiya') ||
      lower.includes('chala diya') ||
      lower.includes('namaste')
    ) {
      speechEmotion = 'happy';
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.pauseListeningForSpeech();
      this.callbacks.onSpeakingStart?.();
      this.startVisemeSimulation(speechEmotion);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.stopVisemeSimulation();
      this.callbacks.onSpeakingEnd?.();
      endCallback?.();
      this.resumeListeningAfterSpeech();
    };

    utterance.onerror = (err) => {
      console.warn('[NOVA Voice] Synthesis event:', err);
      this.isSpeaking = false;
      this.stopVisemeSimulation();
      this.callbacks.onSpeakingEnd?.();
      endCallback?.();
      this.resumeListeningAfterSpeech();
    };

    // Micro-delay ensures the cancelled queue is flushed before new speak call
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[NOVA Voice] speak invocation error:', err);
      }
    }, 25);
  }

  private startVisemeSimulation(baseEmotion: string = 'neutral') {
    this.stopVisemeSimulation();
    let tick = 0;

    this.visemeTimer = setInterval(() => {
      if (!this.isSpeaking) {
        this.stopVisemeSimulation();
        return;
      }

      tick += 1;
      // High-cadence simulated viseme modulation synced with human syllable frequency (approx 6-8 Hz)
      const syllableWave = Math.sin(tick * 0.75);
      const accentWave = Math.cos(tick * 0.45);
      const intensity = Math.max(0, syllableWave * 0.7 + accentWave * 0.3);

      const freqData = this.getAudioFrequencyData();
      let audioFactor = 1.0;
      if (freqData && freqData.length > 0) {
        let sum = 0;
        for (let i = 0; i < 8; i++) sum += freqData[i];
        audioFactor = Math.min(1.5, Math.max(0.4, (sum / 8) / 80));
      }

      const openVal = Math.min(1.0, Math.max(0.08, intensity * audioFactor));
      const wideVal = 0.3 + 0.4 * Math.sin(tick * 0.3);
      const jawVal = openVal * 0.85;

      this.currentViseme = {
        mouthOpen: openVal,
        mouthWide: wideVal,
        jawDrop: jawVal,
        emotion: baseEmotion !== 'neutral' ? baseEmotion : (openVal > 0.65 ? 'happy' : 'neutral'),
      };

      this.callbacks.onVisemeUpdate?.(this.currentViseme);
    }, 45); // ~22 updates/sec for smooth mouth lip sync
  }

  private stopVisemeSimulation() {
    if (this.visemeTimer) {
      clearInterval(this.visemeTimer);
      this.visemeTimer = null;
    }
    this.currentViseme = { mouthOpen: 0, mouthWide: 0.3, jawDrop: 0, emotion: 'neutral' };
    this.callbacks.onVisemeUpdate?.(this.currentViseme);
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.stopVisemeSimulation();
      this.callbacks.onSpeakingEnd?.();
    }
  }

  public getAudioFrequencyData(): Uint8Array | null {
    if (this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      return dataArray;
    }
    return null;
  }

  public getCurrentViseme(): VisemeMetrics {
    return this.currentViseme;
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
