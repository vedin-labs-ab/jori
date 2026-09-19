import { readEnvironmentVariable } from "../shared/environment"

/** Enable only after the merchant can charge saved cards off-session.
 * Unset or unrecognized values keep both settings and charge execution off. */
export function automaticTopUpsAvailable() {
  return readEnvironmentVariable("POLAR_OFF_SESSION_ENABLED") === "true"
}
