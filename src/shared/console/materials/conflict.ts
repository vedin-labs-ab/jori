// Material writes carry the version they read; a stale one is rejected with
// this marker. The reactive queries refresh on their own, so the useful
// response is a toast that says what happened.

export function isVersionConflict(error: unknown) {
  return error instanceof Error && error.message.includes("version conflict")
}

export function conflictMessage(noun: string) {
  return `The ${noun} changed elsewhere. It has been refreshed - try again.`
}
