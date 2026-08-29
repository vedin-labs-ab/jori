import { useState } from "react"
import { toast } from "sonner"

/** "3 tables" / "1 table" — counted noun for bulk toasts. */
export function countNoun(
  count: number,
  noun: { plural: string; singular: string }
) {
  return `${count} ${count === 1 ? noun.singular : noun.plural}`
}

/** Runs one bulk step per selected item, tolerating individual failures
 *  and summarizing the outcome in one toast. `intervalMs` spaces the steps
 *  out — browsers drop file downloads fired back-to-back. */
export function useBulkRunner() {
  const [isBusy, setIsBusy] = useState(false)

  async function run<Item>(
    items: Item[],
    perform: (item: Item) => Promise<unknown>,
    messages: {
      intervalMs?: number
      noun: string
      success: string
      verb: string
    }
  ) {
    setIsBusy(true)
    try {
      const failed = await runEach(items, perform, messages.intervalMs ?? 0)

      if (failed === 0) {
        toast.success(messages.success)
      } else {
        toast.error(
          `Couldn't ${messages.verb} ${failed} of ${items.length} ${messages.noun}.`
        )
      }
    } finally {
      setIsBusy(false)
    }
  }

  return { isBusy, run }
}

async function runEach<Item>(
  items: Item[],
  perform: (item: Item) => Promise<unknown>,
  intervalMs: number
) {
  let failed = 0

  for (const [index, item] of items.entries()) {
    if (index > 0 && intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    try {
      await perform(item)
    } catch {
      failed += 1
    }
  }

  return failed
}
