import { v } from "convex/values"

/** Who a run or conversation is for: the people in one conversation, one
 *  person, or the whole organization. */
export type Audience = "conversation" | "person" | "organization"

export const audienceValidator = v.union(
  v.literal("organization"),
  v.literal("conversation"),
  v.literal("person")
)
