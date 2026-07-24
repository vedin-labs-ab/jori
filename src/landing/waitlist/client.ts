import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

let client: ConvexHttpClient | undefined

/** Marketing pages render outside the Convex React provider, so the waitlist
 *  posts through a one-off HTTP client built on first submit. Resolving the
 *  URL lazily keeps module evaluation safe during SSR. */
function getClient() {
  if (client === undefined) {
    const url = import.meta.env.VITE_CONVEX_URL

    if (!url) {
      throw new Error("Missing VITE_CONVEX_URL")
    }

    client = new ConvexHttpClient(url)
  }

  return client
}

export async function joinWaitlist(input: {
  email: string
  size: string
  work: string
}) {
  return await getClient().mutation(api.waitlist.signup.join, input)
}
