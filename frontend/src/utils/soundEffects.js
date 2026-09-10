/**
 * Web Audio API synthesized subtle sound effects for VEDIXA ERP
 * Zero external audio files, zero network lag, strictly user-action triggered.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

let lastSoundTime = 0;
const SOUND_THROTTLE_MS = 250;

/**
 * Play a short, subtle, professional notification chime
 * @param {'success' | 'error' | 'warning' | 'info'} type
 */
export function playToastSound(type = 'info') {
  try {
    const now = Date.now();
    if (now - lastSoundTime < SOUND_THROTTLE_MS) return;
    lastSoundTime = now;

    const ctx = getAudioContext();
    if (!ctx) return;

    const renderSound = () => {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;

      if (type === 'success') {
        // Gentle rising harmonic chime (C5 -> E5 -> G5 soft sparkle)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(523.25, t); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, t + 0.08); // E5
        osc1.frequency.exponentialRampToValueAtTime(783.99, t + 0.16); // G5

        osc2.frequency.setValueAtTime(1046.5, t); // C6 overtone
        osc2.frequency.exponentialRampToValueAtTime(1318.5, t + 0.12);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.23);
        osc2.stop(t + 0.23);
      } else if (type === 'error') {
        // Soft discrete alert pulse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.14);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.19);
      } else if (type === 'warning') {
        // Subtle double tap attention tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(440, t + 0.08);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.16);
      } else {
        // info: gentle single droplet pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.06); // A5

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.13);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => renderSound()).catch(() => {});
    } else {
      renderSound();
    }
  } catch (err) {
    // Audio synthesis failure should never block UI
    console.debug('Audio effect skipped:', err);
  }
}

/**
 * Plays a pleasant notification chime using synthesized audio
 */
export function playNotificationChime() {
  playToastSound('info');
}

