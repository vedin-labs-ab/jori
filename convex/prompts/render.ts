import { Liquid } from "liquidjs"
import { promptTemplates } from "./generated"

const liquid = new Liquid({
  strictFilters: true,
  strictVariables: true,
  templates: promptTemplates,
})

export function renderPromptTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return liquid.parseAndRenderSync(template, values)
}
