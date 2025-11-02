export default function MicButton({ listening, onStart, onStop, disabled }) {
  const label = listening ? "Stop recording" : "Start recording";
  return (
    <button
      type="button"
      className={`rounded-2xl px-4 py-2 ${listening ? "bg-red-600" : "bg-blue-600"} text-white`}
      onClick={listening ? onStop : onStart}
      aria-pressed={listening}
      aria-label={label}
      disabled={disabled}
    >
      {listening ? "● Recording…" : "🎤 Speak"}
    </button>
  );
}
