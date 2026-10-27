import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Globe,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  QrCode,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface InstallAppModalProps {
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'apk' | 'ios' | 'web'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Use the live public URL
  const appUrl =
    typeof window !== 'undefined' && window.location.href.startsWith('http')
      ? window.location.origin
      : 'https://ais-pre-242zkg6qqcvgnbfwp6wcyj-137681827183.asia-east1.run.app';

  // QR Code generator URL using public QR server for instant scanning
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    appUrl
  )}&bgcolor=030712&color=60a5fa&margin=10`;

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTriggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-xl rounded-2xl bg-[#020514] border-2 border-blue-600/80 shadow-2xl shadow-blue-600/40 backdrop-blur-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-950/90 via-[#061233] to-black border-b border-blue-500/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/50">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold text-white flex items-center gap-1.5">
                <span>INSTALL ON PHONE / WEB ACCESS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-sans">
                  PWA
                </span>
              </h2>
              <p className="text-[11px] text-blue-300">
                अपने मोबाइल में ऐप के रूप में डाउनलोड और इंस्टॉल करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Quick Direct Link & QR Code Section */}
          <div className="p-3.5 rounded-xl bg-black/80 border border-blue-600/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-blue-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Live Web URL:
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">● LIVE & SECURE (HTTPS)</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-black/90 border border-blue-600/50 rounded-xl px-3 py-2 text-xs text-white font-mono truncate focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md shadow-blue-600/40 shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Native 1-Click Install Button if supported by current browser */}
          {isInstallable && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-400/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-blue-300 animate-bounce" />
                <div>
                  <h4 className="font-semibold text-white text-xs">Direct 1-Click Install Available</h4>
                  <p className="text-[11px] text-blue-200">Click below to install directly onto your device</p>
                </div>
              </div>
              <button
                onClick={handleTriggerNativeInstall}
                className="px-4 py-2 rounded-xl bg-white text-blue-950 font-bold hover:bg-blue-100 shadow-lg transition-all text-xs"
              >
                Install Now
              </button>
            </div>
          )}

          {/* OS Switcher Tabs */}
          <div className="flex rounded-xl bg-black/80 border border-blue-600/40 p-1">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'android'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-blue-200'
              }`}
            >
              <span>🤖 PWA Install</span>
            </button>
            <button
              onClick={() => setActiveTab('apk')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'apk'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-blue-200'
              }`}
            >
              <span>📦 Download APK</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ios'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-blue-200'
              }`}
            >
              <span>🍎 iOS Safari</span>
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'web'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-blue-200'
              }`}
            >
              <span>📷 QR Code</span>
            </button>
          </div>

          {/* Tab: APK Build & Download Guide */}
          {activeTab === 'apk' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h4 className="font-semibold text-blue-300 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Android APK (.apk file) कैसे बनाएं और डाउनलोड करें:
              </h4>

              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">PWABuilder (Free 1-Click APK Generator)</span>
                  <a
                    href={`https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/30 transition-all"
                  >
                    <span>Build APK Now</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  PWABuilder पर NOVA का लिंक पहले से मान्य है। बस <strong>"Package for Stores"</strong> ➔ <strong>Android</strong> पर क्लिक करें और सीधे <strong>.apk</strong> फाइल डाउनलोड करके अपने फोन में इंस्टॉल करें!
                </p>
                <div className="p-2 rounded-lg bg-black/80 font-mono text-[10px] text-blue-300">
                  📄 पूरी डिटेल्स GitHub पर <strong>ANDROID_APP_GUIDE.md</strong> फाइल में मौजूद है।
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Android Instructions */}
          {activeTab === 'android' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h4 className="font-semibold text-blue-300 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                एंड्रॉइड फोन में ऐप कैसे डाउनलोड / इंस्टॉल करें (Chrome Browser):
              </h4>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white">लिंक को फोन में खोलें:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      ऊपर दिया गया लिंक अपने फोन के <strong>Google Chrome</strong> ब्राउज़र में खोलें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white">तीन डॉट्स (Menu) पर टैप करें:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      क्रोम में ऊपर दाईं तरफ <strong>3 डॉट्स (⋮)</strong> पर क्लिक करें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white">"Install app" या "Add to Home screen" चुनें:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      मेनू में <strong>"Install app"</strong> (या "Add to Home screen" / होम स्क्रीन में जोड़ें) पर टैप करें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-emerald-300">ऐप रेडी हो जाएगा:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      NOVA का ऐप आइकन आपके फोन के होम स्क्रीन पर आ जाएगा और यह बिना किसी ब्राउज़र बार के फुल स्क्रीन में असली ऐप की तरह चलेगा!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: iPhone / iOS Instructions */}
          {activeTab === 'ios' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h4 className="font-semibold text-blue-300 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                आईफोन (iPhone) में ऐप कैसे डाउनलोड / इंस्टॉल करें (Safari Browser):
              </h4>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Safari में लिंक खोलें:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      अपने iPhone में <strong>Safari</strong> ब्राउज़र खोलें और यह लिंक पेस्ट करके ओपन करें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-white">Share बटन पर टैप करें:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      सफारी में नीचे बीच में मौजूद <strong>Share बटन (⎋ तीर का निशान)</strong> पर क्लिक करें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-white">"Add to Home Screen" चुनें:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      नीचे स्क्रॉल करें और <strong>"Add to Home Screen" (+)</strong> पर टैप करके ऊपर दाईं तरफ <strong>"Add"</strong> दबाएँ।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/70 border border-blue-600/30">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-emerald-300">ऐप तैयार:</strong>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      NOVA का ऐप आइकन आपकी iOS होम स्क्रीन पर आ जाएगा और यह बिना किसी एड्रेस बार के नेटिव ऐप की तरह खुलेगा!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: QR Code Scanning */}
          {activeTab === 'web' && (
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-black/70 border border-blue-600/30 space-y-3 animate-in fade-in duration-150">
              <h4 className="font-semibold text-white text-xs">
                अपने मोबाइल कैमरे से यह QR कोड स्कैन करें:
              </h4>

              <div className="p-3 rounded-2xl bg-black border-2 border-blue-500 shadow-xl shadow-blue-600/30">
                <img
                  src={qrCodeUrl}
                  alt="NOVA PWA QR Code"
                  className="w-44 h-44 rounded-lg object-contain"
                />
              </div>

              <p className="text-[11px] text-blue-300 max-w-sm">
                कैमरा या गूगल लेंस से स्कैन करते ही यह ऐप आपके फोन में तुरंत खुल जाएगा।
              </p>
            </div>
          )}

          {/* Bottom Security Assurance */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-blue-600/20">
            <span className="flex items-center gap-1 text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Safe, Secure & Fast Progressive Web App (PWA)
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
