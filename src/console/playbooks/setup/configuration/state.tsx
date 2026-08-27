import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "@contracts/playbooks/options"
import { useMemo, useState } from "react"

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
