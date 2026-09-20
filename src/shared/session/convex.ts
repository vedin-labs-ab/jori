import { createContext, useContext } from "react"
import { convex } from "./client"

// The Convex side of the session. Convex holds one token fetcher and calls
// it again whenever it needs a token: on connect, and with a forced refresh
// ahead of expiry or when the server refuses one. A token is cached between
// those calls, which is what a reconnecting socket asks for.
//
// The token carries the active organization as a claim, and every console
// query is checked against it. So the token is where an organization is
// entered. While Convex waits on its fetcher the socket is paused: query
// changes and mutations are held, and on resume Convex sends the new token
// first and the accumulated query set after it. A token that names another
// organization is therefore handed over only once the member is prepared in
// it and the page has moved to it. The server sees the new claim with the
// new organization's queries and never one with the other's, and nothing in
// React has to unmount or leave the authenticated state for that to hold.

export type ConvexConnection = {
  isAuthenticated: boolean
  isLoading: boolean
  /** Whether the member is prepared in the organization the token names;
   *  no console query may run until they are. */
  preparation: "pending" | "ready" | "failed"
}

export const ConvexConnectionContext = createContext<ConvexConnection>({
  isAuthenticated: false,
  isLoading: true,
  preparation: "pending",
})

export const useConvexConnection = () => useContext(ConvexConnectionContext)

type Session = {
  /** Mints a token from the session as it stands. */
  mint: () => Promise<string | null>
  /** Prepares the member in the organization, with its token. */
  prepare: (token: string, organizationId: string) => Promise<void>
  /** Moves the page to the organization the session now has active. */
  follow: () => Promise<void>
  onChange: (isAuthenticated: boolean) => void
  onPreparation: (preparation: ConvexConnection["preparation"]) => void
}

let session: Session | undefined
let cached: string | null = null
let pending: Promise<string | null> | undefined
/** Counts the mints, so one that a newer mint has overtaken changes nothing. */
let mints = 0
/** The organization the socket's token names; null before there is one. */
let entered: string | undefined | null = null

async function fetchToken({
  forceRefreshToken,
}: {
  forceRefreshToken: boolean
}) {
  if (cached !== null && !forceRefreshToken) {
    return cached
  }

  return await (pending ?? mint())
}

/** Starts a mint, which every caller shares until it lands. */
function mint() {
  mints += 1
  const minting = mintAndEnter(mints).finally(() => {
    if (pending === minting) {
      pending = undefined
    }
  })
  pending = minting

  return minting
}

async function mintAndEnter(mine: number) {
  const current = session
  const token = (await current?.mint().catch(() => null)) ?? null

  // Overtaken: the newer mint is of the session as it now stands, and it
  // decides what is cached and which organization is entered.
  if (mine !== mints) {
    return token
  }

  if (current !== undefined && token !== null) {
    await enter(current, token)
  }

  cached = token

  return token
}

/** Brings the member and the page along to the organization a new token
 *  names. A failed preparation still moves the page, where the console
 *  stays closed over it: the token is the session's either way, and a page
 *  left on the old organization would query it under the new claim. */
async function enter(current: Session, token: string) {
  const organizationId = readOrganizationClaim(token)

  if (organizationId === entered) {
    return
  }

  const first = entered === null
  let preparation: ConvexConnection["preparation"] = "ready"

  if (organizationId !== undefined) {
    preparation = await current.prepare(token, organizationId).then(
      () => "ready" as const,
      () => "failed" as const
    )
  }

  // The first token meets a page that is already reading the session.
  if (!first) {
    await current.follow()
  }

  current.onPreparation(preparation)
  entered = preparation === "failed" ? null : organizationId
}

function readOrganizationClaim(token: string) {
  try {
    const payload: unknown = JSON.parse(
      atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))
    )
    const organizationId = (payload as { org?: unknown }).org

    return typeof organizationId === "string" ? organizationId : undefined
  } catch {
    return undefined
  }
}

/** Authenticates Convex for the session, reporting whether the server
 *  accepts its tokens, now and after every later refresh. */
export function connectConvex(next: Session) {
  session = next
  cached = null
  entered = null
  convex.setAuth(fetchToken, (isAuthenticated) =>
    session?.onChange(isAuthenticated)
  )
}

export function disconnectConvex() {
  session = undefined
  cached = null
  entered = null
  convex.clearAuth()
}

/** Swaps the token for one minted from the session as it is now, resolving
 *  once the organization it names has been entered. This is how an
 *  organization is activated: the session changes, and the token that
 *  follows brings everything else.
 *
 *  It always mints anew, since a mint already under way is of the session
 *  as it was. And it answers from its own mint, not from what Convex later
 *  reports: Convex drops a `setAuth` that a newer one overtakes without a
 *  word, and a promise tied to that report would never settle. */
export async function refreshConvexToken() {
  cached = null
  const minting = mint()

  convex.setAuth(fetchToken, (isAuthenticated) =>
    session?.onChange(isAuthenticated)
  )

  if ((await minting) === null) {
    throw new Error("The session could not be refreshed.")
  }
}
