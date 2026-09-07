import { normalizeFuzzyAlias } from "@/shared/console/mentions/rank"
import {
  type JobSurfaceIntegration,
  type JobSurfaceIntegrationMeta,
  jobSurfaceIntegrations,
} from "./catalog"

const normalizedIntegrationAliases = new Map(
  jobSurfaceIntegrations.map((integration) => [
    integration.integration,
    [integration.label, ...integration.aliases].map(normalizeFuzzyAlias),
  ])
)

export function findFuzzyJobSurfaceIntegration(
  value: string,
  options: { allowPrefix?: boolean } = {}
): JobSurfaceIntegration | null {
  const normalizedValue = normalizeFuzzyAlias(value)
  const allowPrefix = options.allowPrefix ?? true

  if (normalizedValue.length < 3) {
    return null
  }

  const exactMatch = findUniqueIntegrationMatch(normalizedValue, (alias) =>
    alias === normalizedValue ? 1 : 0
  )

  if (exactMatch !== null) {
    return exactMatch
  }

  const prefixMatch = allowPrefix
    ? findUniqueIntegrationMatch(normalizedValue, (alias) =>
        alias.startsWith(normalizedValue)
          ? normalizedValue.length / alias.length
          : 0
      )
    : null

  if (prefixMatch !== null) {
    return prefixMatch
  }

  if (normalizedValue.length < 4) {
    return null
  }

  const [best, secondBest] = readIntegrationMatchScores(normalizedValue)

  if (best === undefined || best.score < 0.8) {
    return null
  }

  if (secondBest !== undefined && best.score - secondBest.score < 0.08) {
    return null
  }

  return best.integration
}

export function getIntegrationSuggestionScore(
  normalizedQuery: string,
  integration: JobSurfaceIntegrationMeta
) {
  if (normalizedQuery === "") {
    return 1
  }

  const aliasScores = readIntegrationAliases(integration).map((alias) => {
    if (alias.startsWith(normalizedQuery)) {
      return 2 - normalizedQuery.length / alias.length
    }

    const similarity = getFuzzySimilarity(normalizedQuery, alias)

    return similarity >= 0.45 ? similarity : 0
  })

  return Math.max(...aliasScores)
}

function findUniqueIntegrationMatch(
  normalizedValue: string,
  scoreAlias: (alias: string) => number
) {
  const matches = readIntegrationMatchScores(
    normalizedValue,
    scoreAlias
  ).filter((match) => match.score > 0)

  if (matches.length !== 1) {
    return null
  }

  return matches[0].integration
}

function readIntegrationMatchScores(
  normalizedValue: string,
  scoreAlias: (alias: string) => number = (alias) =>
    getFuzzySimilarity(normalizedValue, alias)
) {
  return jobSurfaceIntegrations
    .map((item) => ({
      integration: item.integration,
      score: Math.max(
        ...readIntegrationAliases(item).map((alias) => scoreAlias(alias))
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
}

function readIntegrationAliases(integration: JobSurfaceIntegrationMeta) {
  return normalizedIntegrationAliases.get(integration.integration) ?? []
}

function getFuzzySimilarity(left: string, right: string) {
  const distance = getTranspositionAwareEditDistance(left, right)
  const length = Math.max(left.length, right.length)

  return length === 0 ? 1 : 1 - distance / length
}

function getTranspositionAwareEditDistance(left: string, right: string) {
  const distances = Array.from({ length: left.length + 1 }, (_, leftIndex) =>
    Array.from({ length: right.length + 1 }, (_, rightIndex) =>
      leftIndex === 0 ? rightIndex : rightIndex === 0 ? leftIndex : 0
    )
  )

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex - 1][rightIndex - 1] + cost
      )

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distances[leftIndex][rightIndex] = Math.min(
          distances[leftIndex][rightIndex],
          distances[leftIndex - 2][rightIndex - 2] + 1
        )
      }
    }
  }

  return distances[left.length][right.length]
}
