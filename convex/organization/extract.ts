import { miloModel } from "../../contracts/billing"
import { parseWebsiteAddress } from "../../contracts/website"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { requestStructured } from "../model/structured"
import { emptyFacts, type OrganizationFacts } from "./facts"

const maxOutputTokens = 1200
const maxListItems = 12

const factsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "summary", "aliases", "domains"],
  properties: {
    name: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    aliases: { type: "array", items: { type: "string" } },
    domains: { type: "array", items: { type: "string" } },
  },
}

export type ExtractionInput = {
  primaryUrl: string
  pages: { url: string; text: string }[]
}

export async function extractFacts(
  input: ExtractionInput
): Promise<OrganizationFacts> {
  const value = await requestStructured({
    model: miloModel,
    schemaName: "organization_facts",
    schema: factsSchema,
    system: renderPromptTemplate(promptTemplates["organization/discovery"], {}),
    user: JSON.stringify({ primaryUrl: input.primaryUrl, pages: input.pages }),
    maxTokens: maxOutputTokens,
    reasoning: "medium",
  })

  return normalizeFacts(value)
}

function normalizeFacts(value: Record<string, unknown>): OrganizationFacts {
  return {
    ...emptyFacts,
    ...optionalString("name", value.name),
    ...optionalString("summary", value.summary),
    aliases: readStrings(value.aliases),
    domains: readDomains(value.domains),
  }
}

function optionalString(key: "name" | "summary", value: unknown) {
  const text = typeof value === "string" ? value.trim() : ""

  return text === "" ? {} : { [key]: text }
}

function readStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item !== "")

  return [...new Set(items)].slice(0, maxListItems)
}

// The shared website contract canonicalizes and validates in one step, so the
// list stays consistent no matter how the model formats a domain
// ("https://www.acme.com/" -> "acme.com") and junk hostnames are dropped.
function readDomains(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  const hosts = value.flatMap((item) => {
    const address = typeof item === "string" ? parseWebsiteAddress(item) : null

    return address === null ? [] : [address.key]
  })

  return [...new Set(hosts)].slice(0, maxListItems)
}
