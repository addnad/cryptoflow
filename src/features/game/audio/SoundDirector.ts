import { useSettings } from "@/stores/settings";
import { clamp01 } from "@/lib/utils/math";

/**
 * All audio is synthesized — no samples. An ambient electronic bed built
 * from detuned oscillators, a filtered-noise air layer and a pentatonic
 * arpeggio; `setIntensity` (fed by momentum) opens filters, raises layer
 * gains and quickens the arp so the music physically accelerates with flow.
 * SFX are short envelope voices. Everything respects the settings store and
 * the whole director no-ops until the first user gesture unlocks audio.
 */
export class SoundDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private driftFilter: BiquadFilterNode | null = null;
  private padGain: GainNode | null = null;
  private arpGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;

  private arpTimer: ReturnType<typeof setInterval> | null = null;
  private intensity = 0.5;
  private musicOn = false;
  private unsubscribe: (() => void) | null = null;
  private disposed = false;

  /** Root A minor pentatonic, two octaves. */
  private static SCALE = [110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66];

  init(): void {
    if (this.ctx || this.disposed) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      return; // audio unavailable — stay silent
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);

    this.applyVolumes();
    this.unsubscribe = useSettings.subscribe(() => this.applyVolumes());
  }

  private applyVolumes(): void {
    const s = useSettings.getState();
    if (this.musicBus) this.musicBus.gain.value = s.musicVolume * 0.5;
    if (this.sfxBus) this.sfxBus.gain.value = s.sfxVolume * 0.7;
  }

  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx;
    void ctx.resume();

    // — drift layer: two detuned saws through a momentum-driven lowpass —
    this.driftFilter = ctx.createBiquadFilter();
    this.driftFilter.type = "lowpass";
    this.driftFilter.frequency.value = 400;
    const driftGain = ctx.createGain();
    driftGain.gain.value = 0.05;
    this.driftFilter.connect(driftGain);
    driftGain.connect(this.musicBus);
    for (const detune of [-6, 7]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 55;
      osc.detune.value = detune;
      osc.connect(this.driftFilter);
      osc.start();
    }

    // — pad: soft fifth with a slow breathing LFO —
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.035;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    padFilter.connect(this.padGain);
    this.padGain.connect(this.musicBus);
    for (const freq of [110, 164.81]) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(padFilter);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.014;
    lfo.connect(lfoDepth);
    lfoDepth.connect(this.padGain.gain);
    lfo.start();

    // — arpeggio bus (notes scheduled on a timer) —
    this.arpGain = ctx.createGain();
    this.arpGain.gain.value = 0.0;
    this.arpGain.connect(this.musicBus);
    let step = 0;
    this.arpTimer = setInterval(() => {
      if (!this.ctx || !this.arpGain) return;
      // At low intensity, thin the pattern out.
      const density = 0.35 + this.intensity * 0.65;
      if (Math.random() > density) return;
      const scale = SoundDirector.SCALE;
      const idx =
        (step * 3 + (Math.random() < 0.3 ? 2 : 0)) % scale.length;
      step += 1;
      this.pluck(scale[idx]! * 2, this.arpGain);
    }, 190);

    // — bear rumble: filtered noise, gain driven by proximity —
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 90;
    const noise = this.noiseSource();
    noise.loop = true;
    noise.connect(rumbleFilter);
    rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.musicBus);
    noise.start();
  }

  /** Momentum → music energy. Call every few frames. */
  setIntensity(t: number): void {
    this.intensity = clamp01(t);
    const now = this.ctx?.currentTime ?? 0;
    if (this.driftFilter) {
      this.driftFilter.frequency.setTargetAtTime(
        300 + this.intensity * 2100,
        now,
        0.4,
      );
    }
    if (this.arpGain) {
      this.arpGain.gain.setTargetAtTime(this.intensity * 0.06, now, 0.6);
    }
  }

  setBearProximity(p: number): void {
    if (this.rumbleGain && this.ctx) {
      this.rumbleGain.gain.setTargetAtTime(
        clamp01(p) * 0.5,
        this.ctx.currentTime,
        0.3,
      );
    }
  }

  /* ————— SFX voices ————— */

  jump(): void {
    this.sweep(180, 520, 0.16, "sine", 0.20);
  }
  doubleJump(): void {
    this.sweep(240, 760, 0.2, "sine", 0.22);
  }
  slide(): void {
    this.noiseBurst(900, 0.22, 0.14);
  }
  dash(): void {
    this.sweep(700, 220, 0.18, "sawtooth", 0.10);
    this.noiseBurst(2400, 0.16, 0.10);
  }
  success(perfect: boolean): void {
    const base = perfect ? 660 : 523;
    this.ping(base, 0.18);
    this.ping(base * 1.5, 0.16, 0.06);
    if (perfect) this.ping(base * 2, 0.14, 0.12);
  }
  mistake(): void {
    this.sweep(220, 70, 0.3, "sine", 0.3);
    this.noiseBurst(300, 0.25, 0.2);
  }
  comboMilestone(): void {
    this.ping(880, 0.12);
    this.ping(1108.7, 0.12, 0.07);
    this.ping(1318.5, 0.12, 0.14);
  }
  caught(): void {
    this.sweep(160, 40, 1.1, "sawtooth", 0.4);
    this.noiseBurst(120, 1.0, 0.35);
  }
  uiTick(): void {
    this.ping(1200, 0.05, 0, 0.06);
  }

  /* ————— voice helpers ————— */

  private pluck(freq: number, out: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    const env = ctx.createGain();
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    osc.connect(filter);
    filter.connect(env);
    env.connect(out);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private ping(freq: number, dur: number, delay = 0, vol = 0.16): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private sweep(
    from: number,
    to: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noiseBurst(cutoff: number, dur: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const src = this.noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    const env = ctx.createGain();
    const t = ctx.currentTime;
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private noiseSource(): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  destroy(): void {
    this.disposed = true;
    if (this.arpTimer) clearInterval(this.arpTimer);
    this.unsubscribe?.();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
