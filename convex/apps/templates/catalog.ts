import { type Scope } from "../../../contracts/permissions/scope"
import {
  getPlaybook,
  type PlaybookApp,
} from "../../../contracts/playbooks/catalog"
import { type Id } from "../../_generated/dataModel"
import { playbookTemplates } from "./_generated/templates"

type CompiledTemplate =
  (typeof playbookTemplates)[keyof typeof playbookTemplates]

/**
 * A playbook's app template: compiled source, prebuilt assets, and
 * contract from the in-repo template, joined with the catalog metadata that
 * versions it. Instantiating one is an ordinary app publish — the
 * template only decides the content.
 */
export type AppTemplate = PlaybookApp & {
  key: string
  version: number
  access: Scope
  source: Array<{ path: string; content: string }>
  build: {
    sourceHash: string
    assets: Array<{ path: string; mimeType: string; contentBase64: string }>
  }
  contract: CompiledTemplate["contract"]
}

export function readAppTemplate(key: string): AppTemplate | undefined {
  if (!(key in playbookTemplates)) {
    return undefined
  }

  const compiled = playbookTemplates[key as keyof typeof playbookTemplates]
  const definition = getPlaybook(key)

  if (definition.app === undefined) {
    throw new Error(`Playbook ${key} has a template but no app metadata.`)
  }

  return {
    ...definition.app,
    key,
    version: definition.version,
    access: definition.scope,
    source: compiled.source.map((file) => ({ ...file })),
    build: {
      sourceHash: compiled.build.sourceHash,
      assets: compiled.build.assets.map((asset) => ({ ...asset })),
    },
    contract: compiled.contract,
  }
}

/** One canonical provisioned app per person for personal templates,
 *  per organization for organization ones. */
export function templatePartition(
  template: Pick<AppTemplate, "access">,
  personId: Id<"persons">
) {
  return template.access === "personal" ? `person:${personId}` : "organization"
}
