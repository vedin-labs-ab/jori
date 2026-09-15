import { NotFoundError } from "@turbopuffer/turbopuffer"
import { type Filter } from "@turbopuffer/turbopuffer/resources/custom"
import {
  type NamespaceMultiQueryParams,
  type Row,
} from "@turbopuffer/turbopuffer/resources/namespaces"
import { type Candidate } from "../../../contracts/discovery"
import { namespace } from "./index"
import { spellingKeys, words } from "./spelling"
export type Viewer = { owner: string; tokens: string[]; folders: string[] }
export type Retrieval = {
  candidates: Candidate[]
  partial: boolean
  unavailable: boolean
  more: boolean
  billing: unknown
}
type Query = NamespaceMultiQueryParams.Query

export async function retrieve(
  organizationId: string,
  text: string,
  viewer: Viewer | undefined,
  exclude: string[]
): Promise<Retrieval> {
  const response = await request(organizationId, plan(text, viewer, exclude))
  if (!response) {
    return {
      candidates: [],
      partial: true,
      unavailable: true,
      more: false,
      billing: undefined,
    }
  }
  return {
    candidates: fuse(response.lists, text),
    partial: response.partial,
    unavailable: false,
    more: response.lists.some((list) => list.length >= 40),
    billing: response.billing,
  }
}

function plan(text: string, viewer: Viewer | undefined, exclude: string[]) {
  const clauses: Filter[] = exclude.length ? [["key", "NotIn", exclude]] : []
  if (viewer) {
    clauses.push([
      "Or",
      [
        ["access", "Contains", viewer.owner],
        [
          "And",
          [
            ["access", "ContainsAny", viewer.tokens],
            ["folder", "In", viewer.folders],
          ],
        ],
      ],
    ])
  }
  const common = {
    limit: { total: 40, per: { attributes: ["resource"], limit: 2 } },
    include_attributes: ["key", "revision", "part", "resource"],
    ...(clauses.length ? { filters: ["And", clauses] as Filter } : {}),
  }
  const queries: Query[] = [
    {
      ...common,
      rank_by: [
        "Sum",
        [
          ["Product", 2, ["title", "BM25", text, { last_as_prefix: true }]],
          ["text", "BM25", text, { last_as_prefix: true }],
        ],
      ],
    },
    { ...common, rank_by: ["text", "ANN", ["Embed", text]] },
  ]
  const tokens = words(text)
  if (tokens.length === 1 && tokens[0].length >= 3) {
    queries.push({
      ...common,
      rank_by: ["id", "asc"],
      filters: [
        "And",
        [...clauses, ["spelling", "ContainsAny", spellingKeys(text)]],
      ],
    })
  }
  return queries
}

async function request(organizationId: string, queries: Query[]) {
  try {
    // Configuration errors fail closed too; no client, endpoint, or key escapes
    // to the caller, and fallback never constructs a client in another region.
    const ns = await namespace(organizationId)
    try {
      const response = await ns.multiQuery({ queries })
      return {
        lists: response.results.map((r) => r.rows ?? []),
        partial: false,
        billing: response.billing,
      }
    } catch {
      const response = await ns.query(queries[0])
      return {
        lists: [response.rows ?? []],
        partial: true,
        billing: response.billing,
      }
    }
  } catch (error) {
    return error instanceof NotFoundError
      ? { lists: [], partial: false, billing: undefined }
      : null
  }
}

function fuse(lists: Row[][], text: string) {
  const result = new Map<string, Candidate>()
  const semanticBoost = words(text).length >= 4
  lists.forEach((list, listIndex) => {
    list.forEach((row, rank) => {
      const candidate = readCandidate(row, listIndex)
      if (!candidate) {
        return
      }
      const key = `${candidate.key}:${candidate.revision}:${candidate.part}`
      const current = result.get(key) ?? candidate
      current.score +=
        1 / (60 + rank) +
        (listIndex === 1 && semanticBoost ? 0.3 * (1 - Number(row.$dist)) : 0)
      result.set(key, current)
    })
  })
  return [...result.values()].sort((a, b) => b.score - a.score)
}

function readCandidate(row: Row, list: number): Candidate | null {
  if (
    typeof row.key !== "string" ||
    typeof row.revision !== "string" ||
    typeof row.part !== "number" ||
    !Number.isInteger(row.part) ||
    row.part < 0
  ) {
    return null
  }
  if (
    list === 1 &&
    (typeof row.$dist !== "number" ||
      !Number.isFinite(row.$dist) ||
      row.$dist > 0.7 ||
      row.$dist < 0)
  ) {
    return null
  }
  return { key: row.key, revision: row.revision, part: row.part, score: 0 }
}
