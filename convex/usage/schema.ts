import { defineTable } from "convex/server"
import { v } from "convex/values"
import { toolSurfaceValidator } from "../shared/integrations"

/** What set the work going, kept as its own dimension so scheduled runs and
 *  people asking Jori things can be told apart inside one series. */
export const usageTrigger = v.union(
  v.literal("schedule"),
  v.literal("event"),
  v.literal("message"),
  v.literal("manual")
)

/**
 * One day of metered work per attribution tuple. Every breakdown the console
 * will offer — folder, job, person, surface — is a grouping of these
 * rows rather than a table of its own, so no two dimensions can disagree.
 *
 * Rows are a cache: `runs` and `transactions` stay the truth and a rebuild
 * can replay them. Money and tokens accrue at the debit, which can still
 * land after a run has failed; run counts accrue once, at the terminal
 * transition.
 */
export const usage = defineTable({
  organizationId: v.string(),
  /** A calendar date, `YYYY-MM-DD`, in the organization's declared zone —
   *  not an instant, and deliberately not an epoch day, which would read as
   *  UTC and quietly reintroduce the off-by-one. */
  date: v.string(),
  /** Derived from the attribution tuple (usage/key.ts); the row's identity
   *  for the increment path, since a bucket is found before it is patched. */
  key: v.string(),
  /** Absent is the unfiled bucket, including work whose folder was deleted
   *  with no ancestor left to inherit it. */
  folderId: v.optional(v.id("folders")),
  /** Separates a chat's history so filing it never moves another chat's costs. */
  conversationId: v.optional(v.id("conversations")),
  /** Carries its own label because jobs are hard-deleted — one-shot
   *  ones as soon as they fire. The id alone would leave an unnamed row. */
  job: v.optional(v.object({ id: v.id("jobs"), label: v.string() })),
  personId: v.optional(v.id("persons")),
  surface: toolSurfaceValidator,
  trigger: usageTrigger,
  /** The model the work ran on: a debit's is the model that answered the
   *  turn; a run's end lands under the model the run was set to. */
  model: v.string(),
  /** Stopped runs count as ended, not failed; in-flight runs as neither. */
  runs: v.object({ ended: v.number(), failed: v.number() }),
  micros: v.number(),
  tokens: v.object({ input: v.number(), output: v.number() }),
  updatedAt: v.number(),
})
  .index("by_organization_and_key_and_date", ["organizationId", "key", "date"])
  .index("by_organization_and_date", ["organizationId", "date"])
  .index("by_conversation_and_folder", ["conversationId", "folderId"])
  .index("by_folder_and_date", ["folderId", "date"])
  .index("by_job_and_date", ["job.id", "date"])
