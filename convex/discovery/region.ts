import { requireEnvironmentVariable } from "../shared/environment"
import { requireRegion } from "../shared/origin"
/** CONVEX_CLOUD_URL is platform supplied. Legacy unqualified cloud URLs are US.
 * Fail before sending bytes to extraction, embedding or search providers. */
export function discoveryRegion() {
  const region = requireRegion()
  const deployment = requireEnvironmentVariable("CONVEX_CLOUD_URL")
  const match =
    /^https:\/\/[a-z0-9-]+(?:\.(eu-west-1|us-east-1))?\.convex\.cloud$/.exec(
      deployment
    )
  if (!match || region !== (match[1] === "eu-west-1" ? "eu" : "us")) {
    throw new Error("Search region does not match the Convex deployment.")
  }
  return region
}
