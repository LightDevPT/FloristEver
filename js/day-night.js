export const DAY_NIGHT_CYCLE_SECONDS = 360;
export const MAX_NIGHT_OVERLAY_ALPHA = 0.2;

function smoothstep(value) {
  const amount = Math.max(0, Math.min(1, value));
  return amount * amount * (3 - 2 * amount);
}

function pulse(phase, start, peak, end) {
  if (phase < start || phase > end) return 0;
  if (phase <= peak) return smoothstep((phase - start) / (peak - start));
  return smoothstep((end - phase) / (end - peak));
}

function nightIntensity(phase) {
  if (phase < 0.72) return 0;
  if (phase < 0.8) return smoothstep((phase - 0.72) / 0.08);
  if (phase <= 0.91) return 1;
  if (phase < 0.99) return 1 - smoothstep((phase - 0.91) / 0.08);
  return 0;
}

export function getDayNightLighting(timeSeconds) {
  const elapsed = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const phase = ((elapsed % DAY_NIGHT_CYCLE_SECONDS) + DAY_NIGHT_CYCLE_SECONDS)
    % DAY_NIGHT_CYCLE_SECONDS / DAY_NIGHT_CYCLE_SECONDS;
  const dawnPhase = phase < 0.91 ? phase + 1 : phase;

  return {
    phase,
    night: nightIntensity(phase),
    sunset: pulse(phase, 0.47, 0.58, 0.7),
    twilight: pulse(phase, 0.63, 0.76, 0.87),
    dawn: pulse(dawnPhase, 0.91, 0.97, 1)
  };
}
