export const maxSuggestions = 6

export function normalizeFuzzyAlias(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Prefix matches first, then substring matches, alphabetical within each
 *  and the disabled last; at most the listbox's few. */
export function rankByName<Item extends { disabled?: boolean; label: string }>(
  query: string,
  items: readonly Item[]
): Item[] {
  const normalizedQuery = normalizeFuzzyAlias(query)
  const scored = items.flatMap((item) => {
    const name = normalizeFuzzyAlias(item.label)

    if (normalizedQuery === "" || name.startsWith(normalizedQuery)) {
      return [{ item, score: 2 }]
    }

    return name.includes(normalizedQuery) ? [{ item, score: 1 }] : []
  })

  return scored
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(Boolean(left.item.disabled)) -
          Number(Boolean(right.item.disabled)) ||
        left.item.label.localeCompare(right.item.label)
    )
    .slice(0, maxSuggestions)
    .map((entry) => entry.item)
}
