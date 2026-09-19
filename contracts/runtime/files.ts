import { type RuntimeId } from "./ids.ts"

// Enforced by the broker upload endpoint and pre-checked in the worker, so
// the cap and its user-facing copy cannot drift apart.
const maxFileMegabytes = 25

export const maxFileBytes = maxFileMegabytes * 1024 * 1024
export const fileTooLargeError = `File exceeds the ${maxFileMegabytes} MB limit`

export type UploadedFile = {
  fileId: RuntimeId<"files">
  mimeType: string
  name: string
  size: number
  url: string | null
}

/** A file URL is signed for the window it is issued in and stays valid
 *  through the next one, so it lives between one and two windows. Queries
 *  that return URLs take the caller's epoch as an argument: a new window is
 *  a new subscription, and no cached result outlives its URLs. */
export const urlWindowMs = 15 * 60_000

export function urlEpoch(now: number) {
  return Math.floor(now / urlWindowMs)
}
