/**
 * Audio Chime Utility with Web Audio API Synthesizer & Browser Autoplay Unlock
 */

let audioCtx = null;
let isAudioUnlocked = false;
let lastPlayTime = 0;

// Unlock AudioContext on first legitimate user interaction
function unlockAudioContext() {
  if (isAudioUnlocked) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isAudioUnlocked = true;

    // Remove user gesture listeners once unlocked
    window.removeEventListener('click', unlockAudioContext);
    window.removeEventListener('keydown', unlockAudioContext);
    window.removeEventListener('touchstart', unlockAudioContext);
  } catch (_e) {
    // Autoplay unlock error handled gracefully
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudioContext, { once: true });
  window.addEventListener('keydown', unlockAudioContext, { once: true });
  window.addEventListener('touchstart', unlockAudioContext, { once: true });
}

/**
 * Plays a pleasant two-tone Notification Chime using Web Audio API synthesizer
 */
export function playNotificationChime() {
  const now = Date.now();
  // Prevent duplicate overlapping sounds within 1.2 seconds
  if (now - lastPlayTime < 1200) return;
  lastPlayTime = now;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const t = audioCtx.currentTime;

    // Tone 1: 523.25 Hz (C5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t);
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t);
    osc1.stop(t + 0.3);

    // Tone 2: 659.25 Hz (E5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, t + 0.12);
    gain2.gain.setValueAtTime(0.15, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.45);
  } catch (_err) {
    // Autoplay or audio exception silently caught
  }
}
