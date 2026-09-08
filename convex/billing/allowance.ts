import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { grantAllowance } from "./ledger"

/** Non-billable operational grants. Never exposed to clients or agent tools. */
export const grant = internalMutation({
  args: {
    organizationId: v.string(),
    micros: v.number(),
    idempotencyKey: v.string(),
    reason: v.string(),
    operator: v.string(),
  },
  handler: async (ctx, args) => await grantAllowance(ctx, args),
})
