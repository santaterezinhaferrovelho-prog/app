// Simple bell-like sound synthesized via Web Audio API (no asset needed).
// Browsers block audio until the user has interacted with the page — the caller
// should trigger this from a click/toggle, then subsequent programmatic plays work.

let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playNewOrderChime() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Two-tone chime: high note then a fifth below
  const tones = [
    { freq: 987.77, start: 0.0, dur: 0.28 },   // B5
    { freq: 659.25, start: 0.22, dur: 0.42 },  // E5
    { freq: 1318.5, start: 0.55, dur: 0.5 },   // E6 (sparkle)
  ];

  tones.forEach(({ freq, start, dur }) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });
}

// Preload / unlock the audio context (must be called from a user gesture)
export function unlockAudio() {
  const c = getCtx();
  if (!c) return false;
  // Play a silent buffer to force unlock on iOS
  const buffer = c.createBuffer(1, 1, 22050);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start(0);
  return true;
}
