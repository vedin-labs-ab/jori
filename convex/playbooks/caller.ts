import { v } from "convex/values"
import { type DeliveryChoice } from "../../contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "../../contracts/playbooks/options"
import { readClerkUserEmail, readClerkUserName } from "../access/users"
import { type Integration, integrationValidator } from "../shared/integrations"
import { type PlaybookPlanArgs } from "./plan"
import { deliveryChoiceValidator } from "./schema"

export type PlaybookCallerArgs = {
  tenantId: string
  playbook: string
  choices?: Record<string, Integration>
  destination: DeliveryChoice
  options?: PlaybookOptionValues
}

export const playbookPlanFields = {
  tenantId: v.string(),
  playbook: v.string(),
  choices: v.optional(v.record(v.string(), integrationValidator)),
  destination: deliveryChoiceValidator,
  options: v.optional(
    v.record(v.string(), v.union(v.boolean(), v.string(), v.number()))
  ),
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
    destination: args.destination,
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
  const name = readClerkUserName(identity)

  return {
    ...(email === undefined ? {} : { email }),
    ...(name === undefined ? {} : { name }),
  }
}
