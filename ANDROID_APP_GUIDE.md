# 📱 NOVA 3D AI Assistant - Mobile Installation & APK Guide

यह गाइड आपको NOVA AI Assistant को अपने **Android Phone, iPhone और Desktop** पर एक असली **App (APK / PWA)** की तरह इनस्टॉल करने और चलाने का पूरा तरीका समझाती है।

---

## ⚡ तरीका 1: 1-Click PWA Install (सबसे आसान & तेज़ - कोई डाउनलोड नहीं)

NOVA एक **Progressive Web App (PWA)** है, जिसका मतलब है कि आप इसे बिना किसी थर्ड पार्टी स्टोर के सीधे अपने फोन में असली ऐप (Full Screen, Home Screen Icon, Offline Cache) की तरह इंस्टॉल कर सकते हैं:

### Android (Google Chrome):
1. अपने फोन के Chrome ब्राउज़र में NOVA की वेबसाइट URL खोलें:
   `https://ais-dev-242zkg6qqcvgnbfwp6wcyj-137681827183.asia-east1.run.app`
2. ऊपर दाईं ओर **3 Dots (⋮)** मेनू पर टैप करें।
3. **"Install app"** या **"Add to Home screen"** (होम स्क्रीन पर जोड़ें) पर टैप करें।
4. **"Install"** दबाएं।
5. आपके फोन के ऐप ड्रॉअर और होम स्क्रीन पर **NOVA AI** का नीला आइकन आ जाएगा! यह बिल्कुल नेटिव ऐप की तरह फुल-स्क्रीन में चलेगा।

### iPhone (Apple Safari):
1. Safari ब्राउज़र में URL खोलें।
2. नीचे बीच में **Share (शेयर)** बटन दबाएं।
3. नीचे स्क्रॉल करके **"Add to Home Screen"** पर टैप करें।
4. ऊपर **Add** दबाएं। NOVA आपके iPhone के होम स्क्रीन पर इंस्टॉल हो जाएगा।

---

## 📦 तरीका 2: Native Android APK (.apk File) बनाना

अगर आप अपने फोन के लिए एक असली `.apk` फाइल बनाना चाहते हैं जिसे आप अपने दोस्तों को शेयर कर सकें या फाइल मैनेजर से सीधे इंस्टॉल कर सकें:

### 1. PWABuilder (100% Free & Automatic, Google & Microsoft समर्थित)
1. अपने कंप्यूटर या फोन ब्राउज़र में [PWABuilder.com](https://www.pwabuilder.com) खोलें।
2. NOVA का लाइव वेब URL डालें और **"Start"** पर क्लिक करें।
3. PWABuilder PWA मेनिफेस्ट और सर्विस वर्कर को अपने आप 100% स्कोर देगा।
4. **"Package for Stores"** बटन पर क्लिक करें।
5. **Android** चुनें और **"Generate Package"** दबाएं।
6. आपको एक ZIP फाइल मिलेगी जिसके अंदर रेडी-टू-इंस्टॉल **`app-release-unsigned.apk`** और Google Play Store के लिए **`.aab`** फाइल होगी!
7. इस `.apk` को अपने फोन में भेजें और "Install" पर टैप करके इंस्टॉल कर लें।

### 2. Google Bubblewrap CLI (डेवलपर्स के लिए):
अगर आपके पास Node.js है, तो आप Google के आधिकारिक Bubblewrap टूल से 1 मिनट में APK बना सकते हैं:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest="https://ais-dev-242zkg6qqcvgnbfwp6wcyj-137681827183.asia-east1.run.app/manifest.json"
bubblewrap build
```
यह सीधे `app-release-signed.apk` फाइल जनरेट कर देगा।

---

## 🐍 तरीका 3: Android फोन पर Python Companion चलाना (Termux)

NOVA में एक एडवांस्ड Python Companion Agent (`nova_companion.py`) दिया गया है जो फोन या कंप्यूटर के लोकल हार्डवेयर को सीधे कंट्रोल कर सकता है:

1. Google Play Store या F-Droid से **Termux** ऐप डाउनलोड करें।
2. Termux में ये 3 कमांड्स चलाएं:
   ```bash
   pkg update && pkg install python git
   termux-setup-storage
   ```
3. रिपॉजिटरी से `nova_companion.py` डाउनलोड करें या गिट क्लोन करें:
   ```bash
   python nova_companion.py
   ```
4. अब आपका फोन NOVA के साथ कनेक्ट हो जाएगा और आप फोन के नेटिव फीचर्स को टर्मिनल या वॉयस से कंट्रोल कर सकते हैं!

---

## 🎙️ फोन में माइक (Microphone) सेटिंग्स & फिक्स

अगर फोन में बोलते समय माइक ऑफ हो जाता है या आवाज़ नहीं सुनता:
1. जब आप Chrome में पहली बार माइक आइकन दबाते हैं, तो पॉप-अप में **"While using the app" (ऐप का उपयोग करते समय)** या **"Allow"** चुनें।
2. अगर गलती से ब्लॉक हो गया हो:
   - Chrome के एड्रेस बार में लॉक (🔒) आइकन या ट्यून आइकन पर टैप करें।
   - **Permissions** में जाकर **Microphone** को **Allow** कर दें।
3. NOVA में अब **Continuous Always-On Voice Mode** दिया गया है, जिससे माइक बीच में बंद नहीं होगा और आप बिना बार-बार बटन दबाए बात कर सकते हैं।
