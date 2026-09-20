/** Onboarding is its own download: an organization goes through it once,
 *  and every console load after that would otherwise carry it. Whatever can
 *  lead into it calls this ahead of time, so it is there by the time it is
 *  asked for. */
export const loadOnboarding = () => import("./index")
