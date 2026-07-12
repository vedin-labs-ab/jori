import { v } from "convex/values"
import { type DeliveryChoice } from "../../contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "../../contracts/playbooks/options"
import { type MutationCtx } from "../_generated/server"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { ensureClerkPerson } from "../persons/clerk"
import { type Integration, integrationValidator } from "../shared/integrations"
import { type PlaybookPlanArgs } from "./enable"

export type PlaybookCallerArgs = {
  tenantId: string
  playbook: string
  choices?: Record<string, Integration>
  destination?: DeliveryChoice
  options?: PlaybookOptionValues
}

const destinationValidator = v.union(
  v.object({ kind: v.literal("email") }),
  v.object({
    kind: v.literal("slack"),
    channelId: v.string(),
    channelName: v.string(),
  })
)

export const playbookPlanFields = {
  tenantId: v.string(),
  playbook: v.string(),
  choices: v.optional(v.record(v.string(), integrationValidator)),
  destination: v.optional(destinationValidator),
  options: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
}

export async function resolveCallerPlanArgs(
  ctx: MutationCtx,
  identity: { email?: string; name?: string; subject?: string },
  args: PlaybookCallerArgs
) {
  const recipient = callerRecipient(identity)
  const createdBy = await ensureClerkPerson(ctx, {
    tenantId: args.tenantId,
    clerkSubject: requireClerkUserId(identity),
    email: recipient.email,
    name: recipient.name,
  })

  return playbookPlanArgs(args, createdBy, recipient)
}

export function playbookPlanArgs(
  args: PlaybookCallerArgs,
  createdBy: PlaybookPlanArgs["createdBy"],
  recipient: PlaybookPlanArgs["recipient"],
  artifactId?: PlaybookPlanArgs["artifactId"]
): PlaybookPlanArgs {
  return {
    tenantId: args.tenantId,
    key: args.playbook,
    choices: args.choices ?? {},
    destination: args.destination ?? { kind: "email" },
    options: args.options,
    createdBy,
    recipient,
    artifactId,
  }
}

export function callerRecipient(identity: {
  email?: string
  name?: string
}): PlaybookPlanArgs["recipient"] {
  const email = readClerkUserEmail(identity)

  if (email === undefined) {
    throw new Error(
      "Your account needs an email address before playbooks can email you."
    )
  }

  return { email, name: readClerkUserName(identity) }
}
