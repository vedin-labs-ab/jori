import { createContext, useContext } from "react"

/**
 * Which frame a material section renders in. The decision is made once,
 * above the router outlet, so the console chrome outlives navigation
 * between a material list and one material's page.
 *
 * - `resolving`: not enough is known yet to choose a frame.
 * - `console`: a member with a usable organization, so the page renders
 *   inside the sidebar and header.
 * - `share`: everyone else, so the page renders bare. Anonymous visitors
 *   holding a share link never mount console chrome, and a member whose
 *   session cannot reach the material still reads it through the link.
 */
export type MaterialMode = "resolving" | "console" | "share"

export type MaterialModeInput = {
  hasOrganization: boolean
  isConvexAuthenticated: boolean
  isConvexLoading: boolean
  isOrganizationPending: boolean
  isSessionPending: boolean
  isSignedIn: boolean
  /** undefined until the hash has been read; null when there is no link. */
  secret: string | null | undefined
}

export function resolveMaterialMode({
  hasOrganization,
  isConvexAuthenticated,
  isConvexLoading,
  isOrganizationPending,
  isSessionPending,
  isSignedIn,
  secret,
}: MaterialModeInput): MaterialMode {
  if (secret === undefined || isSessionPending) {
    return "resolving"
  }

  if (!isSignedIn) {
    return "share"
  }

  // Without a link there is nothing to fall back to, so the console frame
  // answers for the whole session — including sending a visitor who is not
  // a member to sign in.
  if (secret === null) {
    return "console"
  }

  if (isConvexLoading || isOrganizationPending) {
    return "resolving"
  }

  return isConvexAuthenticated && hasOrganization ? "console" : "share"
}

const MaterialModeContext = createContext<MaterialMode>("resolving")

export const MaterialModeProvider = MaterialModeContext.Provider

/** Which frame the surrounding section resolved to, so a material page can
 *  render its member body or its share body without asking again. */
export function useMaterialMode() {
  return useContext(MaterialModeContext)
}
