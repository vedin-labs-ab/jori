import { boundedNumber } from "../../shared/input"

const defaultLimit = 15
const maxLimit = 50

export function normalizeLimit(
  value: number | undefined,
  fallback = defaultLimit
) {
  return boundedNumber(value, fallback, 1, maxLimit)
}

export function readCursor(cursor: string | undefined) {
  if (cursor === undefined || cursor.trim() === "") {
    return 0
  }

  const value = Number(cursor)

  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

export function pageItems<Item>(
  items: Item[],
  args: {
    cursor?: string
    limit?: number
    limitFallback?: number
  }
) {
  const offset = readCursor(args.cursor)
  const limit = normalizeLimit(args.limit, args.limitFallback)
  const page = items.slice(offset, offset + limit)
  const nextOffset = offset + page.length

  return {
    cursor: nextOffset < items.length ? String(nextOffset) : null,
    page,
  }
}
