// Synthesized sound effects using Web Audio API — no audio files needed.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.3,
  delay = 0,
) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol);
  vol.connect(ctx.destination);
  const start = ctx.currentTime + delay;
  osc.start(start);
  vol.gain.setValueAtTime(gain, start);
  vol.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.stop(start + duration + 0.05);
}

function playChord(freqs: number[], duration: number, type: OscillatorType = "sine", gain = 0.15) {
  freqs.forEach((f) => playTone(f, duration, type, gain));
}

// ── Sound library ──

const sounds: Record<string, () => void> = {
  "question-start": () => {
    // Rising arpeggio — attention grabber
    playTone(523, 0.15, "triangle", 0.25, 0);     // C5
    playTone(659, 0.15, "triangle", 0.25, 0.1);    // E5
    playTone(784, 0.15, "triangle", 0.25, 0.2);    // G5
    playTone(1047, 0.3, "triangle", 0.3, 0.3);     // C6
  },

  "voting-start": () => {
    // Two-note chime — decision time
    playTone(880, 0.2, "sine", 0.25, 0);      // A5
    playTone(1175, 0.4, "sine", 0.2, 0.15);   // D6
  },

  "reveal": () => {
    // Dramatic reveal — suspenseful chord
    playChord([330, 415, 523], 0.6, "sawtooth", 0.08);  // Emin-ish
    playTone(262, 0.8, "triangle", 0.15, 0.5);          // low C resolution
  },

  "leaderboard": () => {
    // Fanfare — ascending sequence
    playTone(523, 0.12, "square", 0.12, 0);
    playTone(659, 0.12, "square", 0.12, 0.12);
    playTone(784, 0.12, "square", 0.12, 0.24);
    playTone(1047, 0.4, "square", 0.15, 0.36);
    playChord([523, 659, 784], 0.5, "triangle", 0.1);
  },

  "game-over": () => {
    // Victory fanfare
    playTone(523, 0.15, "triangle", 0.2, 0);
    playTone(523, 0.15, "triangle", 0.2, 0.15);
    playTone(523, 0.15, "triangle", 0.2, 0.3);
    playTone(784, 0.6, "triangle", 0.3, 0.45);
    playChord([523, 659, 784, 1047], 0.8, "sine", 0.1);
  },

  "timer-warning": () => {
    // Urgent tick
    playTone(1000, 0.08, "square", 0.15);
  },

  "answer-submitted": () => {
    // Soft confirmation blip
    playTone(880, 0.1, "sine", 0.15, 0);
    playTone(1100, 0.15, "sine", 0.12, 0.08);
  },

  "answer-rejected": () => {
    // Buzzer — wrong!
    playChord([200, 210], 0.3, "sawtooth", 0.12);
  },

  "vote-cast": () => {
    // Click
    playTone(660, 0.06, "sine", 0.2);
  },
};

export function playSound(name: string): void {
  const fn = sounds[name];
  if (fn) {
    try {
      fn();
    } catch {
      // Audio context may fail on some browsers — silently ignore
    }
  }
}
