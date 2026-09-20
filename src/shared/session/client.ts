import { ConvexReactClient } from "convex/react"

export const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL")
}

export const convex = new ConvexReactClient(convexUrl)
