export const profileDebounceMs = 30 * 60_000
export const profileMaxDelayMs = 6 * 60 * 60_000

export const profileWindowMessageLimit = 300
// Windows smaller than this say nothing about which norms still hold, so
// unmentioned claims accrue no misses from them.
export const profileWindowMissMinimum = 8
// Unmentioned claims drop after this many qualifying windows — roughly a
// month of steady traffic at the ceiling cadence.
export const profileMissLimit = 90
export const profileClaimLimit = 30

export const profileOutputTokens = 2_000
