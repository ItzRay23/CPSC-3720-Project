export function speak(text, { rate = 0.95, pitch = 1.0, volume = 1.0 } = {}) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate; u.pitch = pitch; u.volume = volume;
  // Prefer a clear voice if available
  const voices = window.speechSynthesis.getVoices();
  const en = voices.find(v => /en(-|_)US/i.test(v.lang)) || voices[0];
  if (en) u.voice = en;
  window.speechSynthesis.cancel(); // prevent overlap
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
