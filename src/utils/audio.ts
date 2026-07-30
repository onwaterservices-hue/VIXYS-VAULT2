// Web Audio API Sound Synthesizer for Discord and Quant Signals

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playDiscordPing() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Discord-like dual tone ping (high pitch chime)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Discord signature double chime frequency progression
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

    osc2.frequency.setValueAtTime(1046.5, now); // C6
    osc2.frequency.exponentialRampToValueAtTime(1567.98, now + 0.08); // G6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio playback not allowed or supported', err);
  }
}

export function playQuantChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.warn('Audio playback not allowed or supported', err);
  }
}

export function playSubsecondAlert() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.05);
    osc.frequency.setValueAtTime(2000, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn('Audio playback not allowed or supported', err);
  }
}

export function playAlertSound(soundType: 'discord_ping' | 'quant_chime' | 'subsecond_alert' = 'discord_ping') {
  if (soundType === 'discord_ping') playDiscordPing();
  else if (soundType === 'quant_chime') playQuantChime();
  else playSubsecondAlert();
}
