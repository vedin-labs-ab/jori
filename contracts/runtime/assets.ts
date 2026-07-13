// Enforced by the broker upload endpoint and pre-checked in the worker, so
// the cap and its user-facing copy cannot drift apart.
const maxAssetMegabytes = 25

export const maxAssetBytes = maxAssetMegabytes * 1024 * 1024
export const assetTooLargeError = `Asset exceeds the ${maxAssetMegabytes} MB limit`
