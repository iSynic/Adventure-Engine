import type { AssetLoader } from "../assets/AssetLoader";

const CROSSFADE_MS = 250;
const MAX_SFX_CHANNELS = 8;

export class AudioManager {
  private ambientTrack: HTMLAudioElement | null = null;
  private musicTrack: HTMLAudioElement | null = null;
  private sfxPool: HTMLAudioElement[] = [];
  private masterVolume = 1;
  private ambientVolume = 0.6;
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private muted = false;
  private fadeTimer: number | null = null;

  constructor(private assetLoader: AssetLoader) {}

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  setAmbientVolume(v: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, v));
    if (this.ambientTrack) this.ambientTrack.volume = this.masterVolume * this.ambientVolume;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicTrack) this.musicTrack.volume = this.masterVolume * this.musicVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ambientTrack) this.ambientTrack.muted = muted;
    if (this.musicTrack) this.musicTrack.muted = muted;
    for (const s of this.sfxPool) s.muted = muted;
  }

  private applyVolumes(): void {
    if (this.ambientTrack) this.ambientTrack.volume = this.masterVolume * this.ambientVolume;
    if (this.musicTrack) this.musicTrack.volume = this.masterVolume * this.musicVolume;
  }

  async playAmbient(path: string): Promise<void> {
    const oldTrack = this.ambientTrack;
    try {
      const asset = await this.assetLoader.loadAudio(path);
      const newTrack = asset.element.cloneNode() as HTMLAudioElement;
      newTrack.loop = true;
      newTrack.volume = 0;
      newTrack.muted = this.muted;
      this.ambientTrack = newTrack;
      await newTrack.play().catch(() => {});
      this.crossfade(oldTrack, newTrack, this.masterVolume * this.ambientVolume);
    } catch (e) {
      console.warn(`[AudioManager] Could not play ambient: ${path}`);
      if (oldTrack) {
        oldTrack.pause();
      }
    }
  }

  private crossfade(oldTrack: HTMLAudioElement | null, newTrack: HTMLAudioElement, targetVolume: number): void {
    if (this.fadeTimer !== null) {
      cancelAnimationFrame(this.fadeTimer);
      this.fadeTimer = null;
    }
    const start = performance.now();
    const oldStartVol = oldTrack ? oldTrack.volume : 0;

    const step = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / CROSSFADE_MS, 1);
      newTrack.volume = targetVolume * t;
      if (oldTrack) {
        oldTrack.volume = oldStartVol * (1 - t);
      }
      if (t < 1) {
        this.fadeTimer = requestAnimationFrame(step);
      } else {
        this.fadeTimer = null;
        if (oldTrack) {
          oldTrack.pause();
        }
      }
    };
    this.fadeTimer = requestAnimationFrame(step);
  }

  stopAmbient(): void {
    if (this.fadeTimer !== null) {
      cancelAnimationFrame(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.ambientTrack) {
      this.ambientTrack.pause();
      this.ambientTrack = null;
    }
  }

  async playMusic(path: string): Promise<void> {
    if (this.musicTrack) {
      this.musicTrack.pause();
      this.musicTrack = null;
    }
    try {
      const asset = await this.assetLoader.loadAudio(path);
      this.musicTrack = asset.element.cloneNode() as HTMLAudioElement;
      this.musicTrack.loop = true;
      this.musicTrack.volume = this.masterVolume * this.musicVolume;
      this.musicTrack.muted = this.muted;
      await this.musicTrack.play().catch(() => {});
    } catch (e) {
      console.warn(`[AudioManager] Could not play music: ${path}`);
    }
  }

  stopMusic(): void {
    if (this.musicTrack) {
      this.musicTrack.pause();
      this.musicTrack = null;
    }
  }

  async playSfx(path: string): Promise<void> {
    this.pruneSfxPool();
    if (this.sfxPool.length >= MAX_SFX_CHANNELS) {
      const oldest = this.sfxPool.shift();
      if (oldest) {
        oldest.pause();
      }
    }

    try {
      const asset = await this.assetLoader.loadAudio(path);
      const clone = asset.element.cloneNode() as HTMLAudioElement;
      clone.volume = this.masterVolume * this.sfxVolume;
      clone.muted = this.muted;
      this.sfxPool.push(clone);
      clone.onended = () => {
        const idx = this.sfxPool.indexOf(clone);
        if (idx >= 0) this.sfxPool.splice(idx, 1);
      };
      await clone.play().catch(() => {});
    } catch (e) {
      console.warn(`[AudioManager] Could not play SFX: ${path}`);
    }
  }

  private pruneSfxPool(): void {
    this.sfxPool = this.sfxPool.filter((el) => !el.paused || el.currentTime > 0);
  }

  stopAll(): void {
    this.stopAmbient();
    this.stopMusic();
    for (const s of this.sfxPool) s.pause();
    this.sfxPool = [];
  }
}
