"use client";

/**
 * Web Audio API synthesizer for phone call sounds (Ringtone, Dial tone, Call end beep)
 * Works zero-cost in browser without external audio assets.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Plays telephone dialing ringback tone (440Hz + 480Hz dual tone)
   */
  public playDialTone(): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 480;

    gain.gain.setValueAtTime(0.05, ctx.currentTime);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        osc1.disconnect();
        osc2.disconnect();
      } catch {
        // Ignore if already stopped
      }
    };
  }

  /**
   * Plays incoming call ringtone pattern
   */
  public playRingtone(): () => void {
    const ctx = this.getContext();
    if (!ctx) return () => {};

    let isPlaying = true;
    let timeoutId: NodeJS.Timeout;

    const ringBurst = () => {
      if (!isPlaying || !ctx) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 523.25; // C5
      osc2.frequency.value = 659.25; // E5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);

      if (isPlaying) {
        timeoutId = setTimeout(ringBurst, 2500);
      }
    };

    ringBurst();

    return () => {
      isPlaying = false;
      clearTimeout(timeoutId);
    };
  }

  /**
   * Plays short call end / hangup tone
   */
  public playCallEndSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.setValueAtTime(350, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  /**
   * Plays upbeat success chime tone for completed order
   */
  public playSuccessSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
}

export const sounds = new SoundEffects();
