// FloristEver - Música ambiente e efeitos sonoros do jardim
const BACKGROUND_MUSIC_PATH = './musicas/TrilhaSonara-defundo.ogg';

export class SoundController {
  constructor() {
    this.ctx = null;
    this.music = new Audio(BACKGROUND_MUSIC_PATH);
    this.music.loop = true;
    this.music.preload = 'auto';
    this.music.volume = 0.4;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.4;
    this.sfxMuted = false;
    this.musicMuted = false;
    this.isPlayingMusic = false;
    this.pageVisible = globalThis.document?.visibilityState !== 'hidden';
    this.musicWasPlayingBeforeHide = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch((error) => {
        console.error('Não foi possível iniciar os efeitos sonoros:', error);
      });
    }
  }

  canPlaySfx() {
    return Boolean(this.ctx && !this.sfxMuted && this.sfxVolume > 0);
  }

  playTone(frequency, {
    startAt = this.ctx.currentTime,
    duration = 0.2,
    volume = 0.25,
    type = 'sine',
    endFrequency = frequency
  } = {}) {
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const peak = Math.max(0.0001, this.sfxVolume * volume);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startAt + duration);
    }

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + Math.min(0.018, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.01);
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this.music.volume = this.musicVolume;
    if (this.musicVolume === 0) this.stopMusic();
    else if (!this.musicMuted && !this.isPlayingMusic) this.startMusic();
  }

  toggleSfxMute() {
    this.sfxMuted = !this.sfxMuted;
    return this.sfxMuted;
  }

  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    if (this.musicMuted) this.stopMusic();
    else this.startMusic();
    return this.musicMuted;
  }

  playHarvest() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const pitch = 680 + Math.random() * 100;
    this.playTone(pitch, { startAt: now, duration: 0.16, volume: 0.22, type: 'sine', endFrequency: pitch * 1.35 });
    this.playTone(pitch * 2, { startAt: now + 0.025, duration: 0.24, volume: 0.09, type: 'triangle', endFrequency: pitch * 1.6 });
  }

  playCoin() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    this.playTone(987.77, { startAt: now, duration: 0.13, volume: 0.18, type: 'sine' });
    this.playTone(1318.51, { startAt: now + 0.075, duration: 0.3, volume: 0.2, type: 'sine' });
    this.playTone(1975.53, { startAt: now + 0.09, duration: 0.18, volume: 0.045, type: 'triangle' });
  }

  playDeposit() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    this.playTone(392, { startAt: now, duration: 0.12, volume: 0.16, type: 'sine' });
    this.playTone(523.25, { startAt: now + 0.065, duration: 0.18, volume: 0.17, type: 'sine' });
  }

  playUpgrade() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    [392, 493.88, 587.33, 783.99].forEach((frequency, index) => {
      this.playTone(frequency, {
        startAt: now + index * 0.085,
        duration: 0.38,
        volume: 0.17,
        type: 'sine'
      });
    });
  }

  playBouquetCraft() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.playTone(frequency, {
        startAt: now + index * 0.055,
        duration: 0.8,
        volume: 0.11,
        type: index === 3 ? 'triangle' : 'sine'
      });
    });
  }

  playClick() {
    if (!this.canPlaySfx()) return;
    this.playTone(540, {
      startAt: this.ctx.currentTime,
      duration: 0.055,
      volume: 0.12,
      type: 'sine',
      endFrequency: 390
    });
  }

  startMusic() {
    if (this.musicMuted || this.isPlayingMusic || this.musicVolume <= 0 || !this.pageVisible) return;
    this.music.volume = this.musicVolume;
    this.isPlayingMusic = true;
    const playback = this.music.play();
    if (playback && typeof playback.then === 'function') {
      playback.then(() => {
        if (!this.pageVisible || this.musicMuted || this.musicVolume <= 0) {
          this.music.pause();
          this.isPlayingMusic = false;
          return;
        }
        this.isPlayingMusic = true;
      }).catch((error) => {
        this.isPlayingMusic = false;
        if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
          console.error('Não foi possível reproduzir a música de fundo:', error);
        }
      });
    } else {
      this.isPlayingMusic = true;
    }
  }

  stopMusic() {
    this.music.pause();
    this.isPlayingMusic = false;
    this.musicWasPlayingBeforeHide = false;
  }

  setPageVisible(isVisible) {
    if (this.pageVisible === isVisible) return;
    this.pageVisible = isVisible;

    if (!isVisible) {
      this.musicWasPlayingBeforeHide = this.isPlayingMusic;
      this.music.pause();
      this.isPlayingMusic = false;
      return;
    }

    const shouldResume = this.musicWasPlayingBeforeHide;
    this.musicWasPlayingBeforeHide = false;
    if (shouldResume && !this.musicMuted && this.musicVolume > 0) {
      this.startMusic();
    }
  }
}

export const soundManager = new SoundController();
