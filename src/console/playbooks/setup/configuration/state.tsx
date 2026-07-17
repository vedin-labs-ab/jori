import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type PlaybookOptionValues,
  playbookOptionFields,
  resolvePlaybookOptions,
} from "@contracts/playbooks/options"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { api } from "../../../../../convex/_generated/api"

/** Resolve the declarative setup defaults and track the user's changes.
 *  `initial` reopens the dialog on an enablement's stored option values. */
export function useOptionsSetup(
  definition: PlaybookDefinition,
  initial?: PlaybookOptionValues
) {
  const [picks, setPicks] = useState<PlaybookOptionValues>(initial ?? {})
  const setup = definition.setup
  const options = useMemo(
    () => resolvePlaybookOptions(setup, picks),
    [setup, picks]
  )

  return {
    options,
    setupFields:
      setup === undefined
        ? undefined
        : {
            setup,
            values: options,
            onChange: (key: string, value: boolean | number | string) =>
              setPicks((current) => ({ ...current, [key]: value })),
          },
  }
}

/** Add context that is specific to a setup field, plus form validation. */
export function useOptionHints(
  definition: PlaybookDefinition,
  tenantId: string,
  options: PlaybookOptionValues
) {
  const meetings = useMeetingsHint(definition, tenantId, options)

  return {
    optionsIssue: definition.validateOptions?.(options),
    hints: { meetings },
  }
}

/** Ground the Meetings scope in the organization's configured domains. */
function useMeetingsHint(
  definition: PlaybookDefinition,
  tenantId: string,
  options: PlaybookOptionValues
) {
  const hasMeetings = playbookOptionFields(definition.setup).some(
    (field) => field.key === "meetings"
  )
  const profile = useQuery(
    api.organization.profile.get,
    hasMeetings ? { tenantId } : "skip"
  )

  if (!hasMeetings || options.meetings === "external") {
    return undefined
  }

  const domains = [
    ...new Set([
      ...(profile?.domains ?? []),
      ...(profile?.declared?.domains ?? []),
    ]),
  ]

  return (
    <p className="text-muted-foreground">
      {describeInternal(domains)}
      {" · "}
      <Link
        className="underline underline-offset-2 hover:text-foreground"
        to="/context"
      >
        {domains.length > 0 ? "Manage" : "Set up in Context"}
      </Link>
    </p>
  )
}

function describeInternal(domains: string[]) {
  if (domains.length === 0) {
    return "Internal is based on your organization's domains"
  }

  return domains.length === 1
    ? `Internal: anyone at ${domains[0]}`
    : `Internal: ${domains.length} domains`
}
