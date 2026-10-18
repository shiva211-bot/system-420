class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = true;
  private master: GainNode | null = null;

  setMuted(next: boolean) {
    this.muted = next;
    if (this.master) this.master.gain.value = next ? 0 : 0.22;
    if (!next) this.ensure();
  }

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.12, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private noise(dur: number, gain = 0.08) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(g);
    g.connect(this.master);
    src.start();
  }

  playServoSlide(dur: number) {
    this.tone(180, Math.max(0.2, dur * 0.35), "sawtooth", 0.05, 90);
  }

  playDockingClank() {
    this.noise(0.08, 0.12);
    this.tone(220, 0.12, "square", 0.08, 70);
  }

  playDialClick(freq: number) {
    this.tone(freq, 0.04, "square", 0.05);
  }

  playLockRelease() {
    this.tone(140, 0.45, "triangle", 0.1, 420);
    this.noise(0.2, 0.06);
  }

  playUnfold() {
    this.tone(90, 0.8, "sawtooth", 0.06, 40);
  }

  playDisintegration() {
    this.noise(0.9, 0.1);
    this.tone(800, 0.7, "sine", 0.04, 80);
  }

  playVortexRumble() {
    this.tone(48, 1.8, "sine", 0.12, 28);
    this.noise(1.6, 0.05);
  }

  playDoorsOpening() {
    this.tone(70, 1.1, "sawtooth", 0.08, 30);
    this.noise(0.4, 0.08);
  }

  playWelcomeChime() {
    this.tone(523, 0.35, "sine", 0.08);
    this.tone(659, 0.4, "sine", 0.07);
    this.tone(784, 0.55, "sine", 0.06);
  }
}

export const soundEngine = new SoundEngine();
