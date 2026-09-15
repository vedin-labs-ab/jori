import Turbopuffer, { NotFoundError } from "@turbopuffer/turbopuffer"
import {
  type AttributeSchema,
  type Row,
} from "@turbopuffer/turbopuffer/resources/namespaces"
import { sha256Hex } from "../../shared/crypto"
import { requireEnvironmentVariable } from "../../shared/environment"
import { type Gate } from "../../visibility/sight"
import { discoveryRegion } from "../region"

export type { Row } from "@turbopuffer/turbopuffer/resources/namespaces"
export const version = "discovery-v1"
const schema: Record<string, AttributeSchema> = {
  title: {
    type: "string",
    full_text_search: { stemming: false, ascii_folding: true },
  },
  text: {
    type: "string",
    full_text_search: { stemming: true, ascii_folding: true },
    embed: { model: "cohere/embed-v4.0", dims: 512 },
  },
  key: { type: "string" },
  revision: { type: "string" },
  resource: { type: "string" },
  kind: { type: "string" },
  part: { type: "uint" },
  access: { type: "[]string" },
  folder: { type: "string" },
  spelling: { type: "[]string" },
}
/** Cohere v4's documented inference map is EU for aws-eu-west-1 and US for
 * aws-us-east-1. Never substitute a global endpoint or another model. */
export async function namespace(organizationId: string) {
  const region = discoveryRegion()
  const deployment = requireEnvironmentVariable("CONVEX_CLOUD_URL")
  const client = new Turbopuffer({
    apiKey: requireEnvironmentVariable("TURBOPUFFER_API_KEY"),
    region: region === "eu" ? "aws-eu-west-1" : "aws-us-east-1",
    maxRetries: 2,
    timeout: 20_000,
    logLevel: "off",
  })
  const name = `${version}-${await sha256Hex(`${deployment}\n${organizationId}`)}`
  return client.namespace(name)
}
export function accessTokens(gate: Gate) {
  const tokens = gate.ownerId ? [`owner:${gate.ownerId}`] : []
  switch (gate.visibility.mode) {
    case "organization":
      tokens.push("org")
      break
    case "people":
      tokens.push(...gate.visibility.personIds.map((id) => `person:${id}`))
      break
    case "teams":
      tokens.push(...gate.visibility.teamIds.map((id) => `team:${id}`))
      break
  }
  return tokens
}
export async function upsert(organizationId: string, rows: Row[]) {
  if (!rows.length) {
    return
  }
  const ns = await namespace(organizationId)
  // Native embedding writes allow at most 30 rows. Batch across sources too.
  for (let start = 0; start < rows.length; start += 30) {
    await ns.write({
      schema,
      distance_metric: "cosine_distance",
      upsert_rows: rows.slice(start, start + 30),
    })
  }
}
export async function remove(organizationId: string, keys: string[]) {
  if (!keys.length) {
    return
  }
  const ns = await namespace(organizationId)
  await ns.write({ delete_by_filter: ["key", "In", keys] }).catch(ignoreMissing)
}
export async function erase(organizationId: string) {
  await (await namespace(organizationId)).deleteAll().catch(ignoreMissing)
}
export function ignoreMissing(error: unknown) {
  if (!(error instanceof NotFoundError)) {
    throw new Error("Regional search request failed.")
  }
}

export async function refresh(
  organizationId: string,
  key: string,
  revision: string,
  gate: Gate
) {
  await (await namespace(organizationId)).write({
    patch_by_filter: {
      filters: ["key", "Eq", key],
      patch: {
        revision,
        access: accessTokens(gate),
        folder: gate.folderId ?? "root",
      },
    },
  })
}
