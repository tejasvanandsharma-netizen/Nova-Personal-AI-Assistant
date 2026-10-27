# 🌟 NOVA - 3D Female AI Personal Assistant & Action Engine

An intelligent, full-stack, futuristic 3D Personal AI Assistant equipped with:
- **Real-Time 3D Female Avatar**: Three.js procedural avatar with real-time lip-sync, emotion modulation, eye saccades, and natural facial gestures.
- **Multimodal Voice Engine with Continuous Always-On Mode**: Speech-to-Text and natural female speech synthesis in **Hinglish, Hindi, and English**. Optimized for mobile phones with non-blocking audio streams and auto-recovery.
- **Immediate Holographic Action Stage**:
  - **YouTube & Music**: In-app embedded YouTube player with search playlists and 1-click native launcher.
  - **Live Factual Grounding**: Instant answers for real-time temperature, weather forecasts, date & atomic clock, recipes, and web knowledge.
  - **Interactive Calculator**: Built-in sci-fi arithmetic evaluator on screen.
  - **Direct App Execution**: WhatsApp Web, Notepad, Google Chrome, VS Code.
- **Python Companion Bridge (`nova_companion.py`)**: Standalone cross-platform desktop & Android Termux companion agent providing local OS execution, hardware telemetry (CPU, RAM, Battery), native TTS, and interactive terminal CLI.
- **Mobile PWA & APK Ready**: Full PWA compliance (Web App Manifest, Service Worker, maskable icons) with 1-click install on Android & iOS, plus PWABuilder APK packaging instructions.
- **Futuristic UI**: Royal Blue (`#2563eb`) and Onyx Black aesthetic with interactive audio waveform visualizer and unified input stream.

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Python 3.8+](https://python.org/) (for the optional local companion bridge)
- npm or yarn

### 2. Clone and Install
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd nova-ai-assistant
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# Gemini API Key (Required for AI planning, search grounding, and chat reasoning)
GEMINI_API_KEY="your_gemini_api_key_here"

# App URL (Optional, defaults to local port 3000)
APP_URL="http://localhost:3000"

# Local Python Bridge URL (Optional, default: http://127.0.0.1:8765)
LOCAL_AGENT_URL="http://127.0.0.1:8765"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🐍 Python Companion Agent (`nova_companion.py`)

Run the standalone Python companion agent on your PC or Android phone (via Termux):

### Run as Local System Bridge (Port 8765):
```bash
python nova_companion.py
```
This enables NOVA web HUD to control local Windows, macOS, or Linux applications and gather live hardware telemetry (CPU, RAM, Battery).

### Run in Interactive Terminal CLI Mode:
```bash
python nova_companion.py --cli
```
Allows running commands (`play song`, `open calculator`, `weather`) directly in your terminal.

---

## 📱 Mobile App (PWA & APK Installation)

See the full detailed guide in **[`ANDROID_APP_GUIDE.md`](./ANDROID_APP_GUIDE.md)**.

### 1-Click PWA Install:
1. Open the hosted web URL in **Chrome** (Android) or **Safari** (iPhone).
2. Android: Tap the 3 dots menu (`⋮`) -> **"Install app"** or **"Add to Home screen"**.
3. iPhone: Tap the **Share** button (`⎋`) -> **"Add to Home Screen"**.
4. The NOVA AI icon will appear on your mobile home screen and launch in full-screen native app mode.

### Generate Android APK:
Use [PWABuilder.com](https://www.pwabuilder.com) to generate signed `.apk` and `.aab` packages in 1 click for direct sideloading or Google Play Store.

---

## 🎙️ Mobile Microphone & Voice Control Fix

- **Always-On Continuous Voice Mode**: Enabled by default so the mic remains active while chatting without prematurely shutting off on phone silence.
- **Audio Conflict Prevention**: Speech recognition runs independently from MediaStream to prevent Android OS exclusive mic hardware locks.
- **Microphone Permissions**: Ensure microphone permissions are set to "Allow" in your mobile browser address bar.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Three.js, Tailwind CSS, Motion (Framer Motion), Lucide Icons
- **Backend**: Express, Node.js, TSX, Vite
- **AI & Grounding**: Google Gemini API (`@google/genai`) with Google Search Grounding tool
- **Voice Engine**: Web Speech API (`SpeechRecognition`, `speechSynthesis`) + Web Audio API synthesizer
- **Python Bridge**: Standard Library (`http.server`, `subprocess`, `platform`, `psutil`)
- **PWA**: Web App Manifest, Service Worker, Mobile Touch Icons

---

## 📄 License
MIT License.
