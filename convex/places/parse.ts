import { readArray, readNumber, readRecord, readString } from "../shared/input"
import {
  type ClaimAddition,
  type ClaimReview,
  type ClaimVerdict,
  claimVerdicts,
  type ProfileReview,
} from "./claims"
import { type PlaceSection, placeSections } from "./schema"

// Strict-mode wire contract for one profile review: one indexed verdict per
// claim plus freestanding additions. Strict providers require every property
// present, so `text` rides along on every review and is read only for
// revisions.
export const profileReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reviews", "additions"],
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "verdict", "text"],
        properties: {
          index: {
            type: "integer",
            description: "Claim number from the input.",
          },
          verdict: { type: "string", enum: [...claimVerdicts] },
          text: {
            type: "string",
            description:
              "Replacement wording for revised verdicts; empty otherwise.",
          },
        },
      },
    },
    additions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "text"],
        properties: {
          section: { type: "string", enum: [...placeSections] },
          text: { type: "string" },
        },
      },
    },
  },
}

// Resolves the indexed wire reviews into one review per claim position;
// claims the model skipped stay unmentioned, out-of-range indexes are
// dropped. The strict schema makes malformed entries unlikely, but nothing
// here trusts it.
export function parseProfileReview(
  value: Record<string, unknown>,
  claimCount: number
): ProfileReview {
  const reviews = Array.from(
    { length: claimCount },
    (): ClaimReview => ({ verdict: "unmentioned", text: "" })
  )

  for (const entry of readArray(value.reviews)) {
    const record = readRecord(entry)
    const position = Math.trunc(readNumber(record, "index") ?? 0) - 1
    const verdict = readVerdict(record)

    if (verdict !== undefined && position >= 0 && position < claimCount) {
      reviews[position] = { verdict, text: readString(record, "text") ?? "" }
    }
  }

  return { reviews, additions: parseAdditions(value.additions) }
}

function parseAdditions(value: unknown): ClaimAddition[] {
  return readArray(value).flatMap((entry) => {
    const record = readRecord(entry)
    const section = readString(record, "section")
    const text = readString(record, "text")

    return isPlaceSection(section) && text !== undefined
      ? [{ section, text }]
      : []
  })
}

function readVerdict(
  record: Record<string, unknown>
): ClaimVerdict | undefined {
  const verdict = readString(record, "verdict")

  return claimVerdicts.find((candidate) => candidate === verdict)
}

function isPlaceSection(value: string | undefined): value is PlaceSection {
  return placeSections.some((section) => section === value)
}
