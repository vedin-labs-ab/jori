import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireIdentity } from "."
import { readAllowance } from "./allowlist"
import { readUserProfile } from "./users"

/**
 * Whether the signed-in caller may open an organization yet.
 *
 * The console asks so it can show the right thing rather than let someone
 * press a button that fails. It is not the enforcement: Better Auth refuses
 * the creation itself, and every other surface already requires an
 * organization claim this caller does not have. A caller only ever learns
 * about their own address.
 */
export const status = query({
  args: {},
  returns: v.object({
    allowed: v.boolean(),
    email: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const { email } = readUserProfile(identity)

    if (email === undefined) {
      return { allowed: false, email: null }
    }

    return { allowed: (await readAllowance(ctx, email)) !== null, email }
  },
})
