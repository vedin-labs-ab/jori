/** One page of the candidates that match, past the ones earlier pages
 *  served. Deciding whether a candidate matches may already build its
 *  row; the page keeps that row rather than building it again, and a
 *  candidate the offset skips is never built at all. */
export type PageScan<Candidate, Row> = {
  offset: number
  numItems: number
  match: (candidate: Candidate) => Promise<{ row?: Row } | null>
  row: (candidate: Candidate) => Promise<Row>
}

export async function scanPage<Candidate, Row>(
  candidates: AsyncIterable<Candidate>,
  scan: PageScan<Candidate, Row>
) {
  const rows: Row[] = []
  let matchingIndex = 0
  let hasMore = false

  for await (const candidate of candidates) {
    const match = await scan.match(candidate)

    if (match === null) {
      continue
    }

    if (matchingIndex < scan.offset) {
      matchingIndex += 1
      continue
    }

    if (rows.length >= scan.numItems) {
      hasMore = true
      break
    }

    rows.push(match.row ?? (await scan.row(candidate)))
    matchingIndex += 1
  }

  return {
    continueCursor: String(scan.offset + rows.length),
    isDone: !hasMore,
    page: rows,
  }
}

export async function countMatches<Candidate>(
  candidates: AsyncIterable<Candidate>,
  matches: (candidate: Candidate) => Promise<boolean>
) {
  let count = 0

  for await (const candidate of candidates) {
    if (await matches(candidate)) {
      count += 1
    }
  }

  return count
}
