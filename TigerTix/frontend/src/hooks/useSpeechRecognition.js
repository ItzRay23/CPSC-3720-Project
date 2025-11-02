import { useEffect, useMemo, useRef, useState } from "react";

export default function useSpeechRecognition({ lang = "en-US", interim = true } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const SpeechRecognition = useMemo(() => {
    /* Chrome/Edge: webkitSpeechRecognition; Firefox: (none yet) */
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => { setSupported(!!SpeechRecognition); }, [SpeechRecognition]);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = lang;
    r.interimResults = interim;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      let finalText = "";
      for (const res of e.results) {
        if (res.isFinal) finalText += res[0].transcript.trim() + " ";
      }
      if (finalText) setTranscript((t) => (t + finalText).trim());
    };
    r.onerror = (e) => { setError(e.error || "speech-error"); setListening(false); };
    r.onend = () => setListening(false);

    recognitionRef.current = r;
    return () => { r.abort(); };
  }, [SpeechRecognition, lang, interim]);

  const start = async () => {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    setError(null);

    // Optional short "beep" before recording (accessibility cue)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g).connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 120);
    } catch { /* no-op if blocked */ }

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch { /* ignored if already started */ }
  };

  const stop = () => {
    if (recognitionRef.current && listening) recognitionRef.current.stop();
  };

  return { supported, listening, transcript, error, start, stop, setTranscript };
}
