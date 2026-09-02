import { findFuzzyJobSurfaceIntegration } from "./fuzzy"
import {
  canStartMention,
  type JobMention,
  type JobMentionCatalog,
  readJobMentions,
} from "./scan"

/** A finished explicit token at the end of the text. Fuzzy spellings are
 * accepted for integrations only, and only at a normal mention boundary. */
export function findCompletedJobMention(
  text: string,
  catalog: JobMentionCatalog
): JobMention | null {
  const exact = readJobMentions(text, catalog).find(
    (mention) => mention.end === text.length
  )

  return exact ?? readFuzzyIntegrationMatch(text)
}

function readFuzzyIntegrationMatch(text: string): JobMention | null {
  const start = text.lastIndexOf("@")

  if (start < 0 || !canStartMention("integration", text, start)) {
    return null
  }

  const token = text.slice(start + 1)

  if (token === "" || /[^a-z0-9-]/i.test(token)) {
    return null
  }

  const integration = findFuzzyJobSurfaceIntegration(token)

  return integration === null
    ? null
    : {
        end: text.length,
        id: integration,
        kind: "integration",
        start,
      }
}
