/**
 * Wave progression helpers (pure functions)
 *
 * Responsibilities:
 * - Provide thresholds for letter-kill progression per wave
 * - Decide which waves spawn a boss encounter
 * - Compute the next wave number based on current progress
 */
export const THRESHOLDS = [0, 3, 4, 5, 6]

/**
 * Returns the kill threshold for a given wave (1-based).
 * @param {number} wave
 * @returns {number}
 */
export function thresholdForWave(wave) {
  const w = Math.max(1, Math.floor(Number(wave) || 1))
  return THRESHOLDS[w] ?? Number.POSITIVE_INFINITY
}

/**
 * Returns true if the wave is a boss wave.
 * Boss appears only on wave 5; wave 6+ are letters-only (more aggressive).
 * @param {number} wave
 * @returns {boolean}
 */
export function isBossWave(wave) {
  // Only wave 5 is the boss; wave 6+ are letters-only
  return Math.max(1, Math.floor(Number(wave) || 1)) === 5
}

/**
 * Computes the next wave based on number of letters destroyed.
 * Progression applies for waves 1–4; 5 is boss; 6+ are letters-only.
 * @param {number} currentWave
 * @param {number} lettersDestroyed
 * @returns {number}
 */
export function nextWave(currentWave, lettersDestroyed) {
  const w = Math.max(1, Math.floor(Number(currentWave) || 1))
  const needed = thresholdForWave(w)
  if (w <= 4 && (lettersDestroyed || 0) >= needed) return w + 1
  return w
}
