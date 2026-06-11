import {
  type ScheduleSurfaceProvider,
  type ScheduleSurfaceProviderMeta,
  scheduleSurfaceProviders,
} from "./catalog"

export function normalizeFuzzyAlias(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function findFuzzyScheduleSurfaceProvider(
  value: string
): ScheduleSurfaceProvider | null {
  const normalizedValue = normalizeFuzzyAlias(value)

  if (normalizedValue.length < 3) {
    return null
  }

  const exactMatch = findUniqueProviderMatch(normalizedValue, (alias) =>
    alias === normalizedValue ? 1 : 0
  )

  if (exactMatch !== null) {
    return exactMatch
  }

  const prefixMatch = findUniqueProviderMatch(normalizedValue, (alias) =>
    alias.startsWith(normalizedValue)
      ? normalizedValue.length / alias.length
      : 0
  )

  if (prefixMatch !== null) {
    return prefixMatch
  }

  if (normalizedValue.length < 4) {
    return null
  }

  const [best, secondBest] = readProviderMatchScores(normalizedValue)

  if (best === undefined || best.score < 0.8) {
    return null
  }

  if (secondBest !== undefined && best.score - secondBest.score < 0.08) {
    return null
  }

  return best.provider
}

export function getProviderSuggestionScore(
  normalizedQuery: string,
  provider: ScheduleSurfaceProviderMeta
) {
  if (normalizedQuery === "") {
    return 1
  }

  const aliasScores = readProviderAliases(provider).map((alias) => {
    if (alias.startsWith(normalizedQuery)) {
      return 2 - normalizedQuery.length / alias.length
    }

    const similarity = getFuzzySimilarity(normalizedQuery, alias)

    return similarity >= 0.45 ? similarity : 0
  })

  return Math.max(...aliasScores)
}

function findUniqueProviderMatch(
  normalizedValue: string,
  scoreAlias: (alias: string) => number
) {
  const matches = readProviderMatchScores(normalizedValue, scoreAlias).filter(
    (match) => match.score > 0
  )

  if (matches.length !== 1) {
    return null
  }

  return matches[0].provider
}

function readProviderMatchScores(
  normalizedValue: string,
  scoreAlias: (alias: string) => number = (alias) =>
    getFuzzySimilarity(normalizedValue, alias)
) {
  return scheduleSurfaceProviders
    .map((item) => ({
      provider: item.provider,
      score: Math.max(
        ...readProviderAliases(item).map((alias) => scoreAlias(alias))
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
}

function readProviderAliases(provider: ScheduleSurfaceProviderMeta) {
  return [provider.label, ...provider.aliases].map(normalizeFuzzyAlias)
}

function getFuzzySimilarity(left: string, right: string) {
  const distance = getLevenshteinDistance(left, right)
  const length = Math.max(left.length, right.length)

  return length === 0 ? 1 : 1 - distance / length
}

function getLevenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = Array.from({ length: right.length + 1 }, () => 0)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      )
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index]
    }
  }

  return previous[right.length]
}
