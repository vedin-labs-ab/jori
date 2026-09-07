import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start"

function requireViteEnv(name: "VITE_CONVEX_URL" | "VITE_CONVEX_SITE_URL") {
  const value = import.meta.env[name]

  if (typeof value !== "string" || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}

/** Server-side auth utilities. `handler` proxies /api/auth/* to the Better
 *  Auth routes on the Convex deployment so sessions live in first-party
 *  cookies on the app origin. */
export const { handler, getToken } = convexBetterAuthReactStart({
  convexUrl: requireViteEnv("VITE_CONVEX_URL"),
  convexSiteUrl: requireViteEnv("VITE_CONVEX_SITE_URL"),
})
