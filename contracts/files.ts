/** A file URL is signed for the window it is issued in and stays valid
 *  through the next one, so it lives between one and two windows. Queries
 *  that return URLs take the caller's epoch as an argument: a new window is
 *  a new subscription, and no cached result outlives its URLs. */
export const urlWindowMs = 15 * 60_000

export function urlEpoch(now: number) {
  return Math.floor(now / urlWindowMs)
}
