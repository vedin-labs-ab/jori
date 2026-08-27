// Enforced by the broker upload endpoint and pre-checked in the worker, so
// the cap and its user-facing copy cannot drift apart.
const maxFileMegabytes = 25

export const maxFileBytes = maxFileMegabytes * 1024 * 1024
export const fileTooLargeError = `File exceeds the ${maxFileMegabytes} MB limit`
