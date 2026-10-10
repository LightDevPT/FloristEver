import assert from 'node:assert/strict';
import test from 'node:test';

class MockAudio {
  constructor() {
    this.paused = true;
    this.volume = 1;
    this.loop = false;
    this.playCount = 0;
    this.pauseCount = 0;
  }

  play() {
    this.paused = false;
    this.playCount++;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.pauseCount++;
  }
}

globalThis.Audio = MockAudio;
globalThis.document = { visibilityState: 'visible' };

const { SoundController } = await import('../js/audio.js');

test('backgrounding pauses music and returning resumes it', () => {
  const sound = new SoundController();
  sound.startMusic();
  assert.equal(sound.music.playCount, 1);

  sound.setPageVisible(false);
  assert.equal(sound.music.paused, true);
  assert.equal(sound.isPlayingMusic, false);

  sound.setPageVisible(true);
  assert.equal(sound.music.paused, false);
  assert.equal(sound.music.playCount, 2);
});

test('muted music stays paused when returning to the foreground', () => {
  const sound = new SoundController();
  sound.startMusic();
  sound.setPageVisible(false);
  sound.toggleMusicMute();
  sound.setPageVisible(true);

  assert.equal(sound.music.paused, true);
  assert.equal(sound.music.playCount, 1);
});

test('music does not start while the game is in the background', () => {
  const sound = new SoundController();
  sound.setPageVisible(false);
  sound.startMusic();

  assert.equal(sound.music.paused, true);
  assert.equal(sound.music.playCount, 0);
});
