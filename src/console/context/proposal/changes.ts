import { type ContextFacts, isFactPresent } from "../types"

export type ProposalChange = {
  after: string[]
  before: string[]
  delta: string[]
  field: string
  status: string
}

const emptyFacts: ContextFacts = {
  aliases: [],
  domains: [],
  name: undefined,
  products: [],
  summary: undefined,
}

export function proposalChanges(
  current: ContextFacts | null,
  proposed: ContextFacts
) {
  const approved = current ?? emptyFacts

  return [
    textChange("Name", approved.name, proposed.name),
    textChange("Summary", approved.summary, proposed.summary),
    listChange("Also known as", approved.aliases, proposed.aliases),
    listChange("Websites", approved.domains, proposed.domains),
    listChange(
      "Products",
      productLines(approved.products),
      productLines(proposed.products)
    ),
  ].filter((change): change is ProposalChange => change !== null)
}

export function proposalName(proposed: ContextFacts) {
  return isFactPresent(proposed.name) ? proposed.name : "this organization"
}

function textChange(
  field: string,
  before: string | undefined,
  after: string | undefined
): ProposalChange | null {
  const beforeLines = isFactPresent(before) ? [before.trim()] : []
  const afterLines = isFactPresent(after) ? [after.trim()] : []

  if (sameLines(beforeLines, afterLines)) {
    return null
  }

  return {
    after: afterLines,
    before: beforeLines,
    delta: [statusLabel(beforeLines, afterLines)],
    field,
    status: statusLabel(beforeLines, afterLines),
  }
}

function listChange(
  field: string,
  before: string[],
  after: string[]
): ProposalChange | null {
  const beforeLines = visibleLines(before)
  const afterLines = visibleLines(after)

  if (sameLines(beforeLines, afterLines)) {
    return null
  }

  return {
    after: afterLines,
    before: beforeLines,
    delta: listDelta(beforeLines, afterLines),
    field,
    status: statusLabel(beforeLines, afterLines),
  }
}

function listDelta(before: string[], after: string[]) {
  const beforeValues = new Set(before.map(normalizeLine))
  const afterValues = new Set(after.map(normalizeLine))
  const added = after.filter((line) => !beforeValues.has(normalizeLine(line)))
  const removed = before.filter((line) => !afterValues.has(normalizeLine(line)))

  if (added.length + removed.length === 0) {
    return ["Reordered"]
  }

  return [
    ...added.map((line) => `Added: ${line}`),
    ...removed.map((line) => `Removed: ${line}`),
  ]
}

function statusLabel(before: string[], after: string[]) {
  if (before.length === 0) {
    return "Added"
  }

  if (after.length === 0) {
    return "Removed"
  }

  return "Changed"
}

function productLines(products: ContextFacts["products"]) {
  return visibleLines(
    products.map((product) => {
      const description = product.description?.trim()

      return description === undefined || description === ""
        ? product.name
        : `${product.name}: ${description}`
    })
  )
}

function visibleLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter((line) => line !== "")
}

function sameLines(before: string[], after: string[]) {
  const beforeText = before.map(normalizeLine).join("\n")
  const afterText = after.map(normalizeLine).join("\n")

  return beforeText === afterText
}

function normalizeLine(line: string) {
  return line.trim().toLowerCase()
}
