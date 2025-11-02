import { useEffect, useRef, useState } from "react";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { speak, stopSpeaking } from "../utils/tts";
import { sendChatMessage } from "../api";

export default function VoiceChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can help you browse events and prepare a booking. Say “Show events this weekend” or “Book two tickets for Jazz Night.” I will NOT book anything until you confirm." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);

  const { supported, listening, transcript, error, start, stop, setTranscript } =
    useSpeechRecognition();

  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages]);

  async function onSend(text) {
    setSending(true); stopSpeaking();
    setMessages(m => [...m, { role: "user", text }]);
    try {
      const data = await sendChatMessage(text);
      const reply = data.replyText || data.response || "I can browse events and prepare a booking. Try: “Book two tickets for Jazz Night.”";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
      speak(reply);
    } catch (e) {
      const msg = `Network/server error: ${e.message || e}`;
      setMessages(m => [...m, { role: "assistant", text: msg }]);
    } finally {
      setSending(false); setTranscript(""); setInput("");
    }
  }
  const submit = (e) => { e.preventDefault(); const t = input.trim(); if (t) onSend(t); };

  return (
    <section className="voicechat">
      <div className="vc-card" role="region" aria-label="AI booking assistant chat">
        <div className="vc-header">
          I’ll help you explore events and prepare a booking. I’ll always ask before taking action.
        </div>

        <div ref={logRef} className="vc-log" role="log" aria-live="polite" aria-relevant="additions text">
          {messages.map((m, i) => (
            <div key={i} className={`vc-row ${m.role === "user" ? "user" : "assist"}`}>
              <div className={`vc-bubble ${m.role === "user" ? "user" : "assist"}`}>{m.text}</div>
            </div>
          ))}
        </div>

        <form className="vc-footer" onSubmit={submit}>
          <textarea
            className="vc-input"
            placeholder={supported ? "Type or press 🎤 to speak…" : "Type your request…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="button"
            className={`vc-btn ${listening ? "record" : "mic"}`}
            onClick={listening ? stop : start}
            disabled={!supported || sending}
            aria-pressed={listening}
            aria-label={listening ? "Stop recording" : "Start recording"}
          >
            {listening ? "● Recording…" : "🎤 Speak"}
          </button>
          <button type="submit" className="vc-btn primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <p className="vc-tip">
        Tip: say “Book two tickets for Jazz Night.” I’ll ask you to confirm before anything is booked.
        {supported ? (error ? ` Speech error: ${error}` : "") : " (Speech recognition not supported in this browser.)"}
      </p>
    </section>
  );
}
