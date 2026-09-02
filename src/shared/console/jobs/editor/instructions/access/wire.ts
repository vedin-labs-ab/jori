import { type ComponentType, createContext } from "react"

/** A tool's wire schemas: what a call to it accepts and what it returns,
 *  by tool name. */
export type ToolReferences = Record<
  string,
  { request: unknown; response: unknown }
>

export type ToolReferenceLoaderProps = {
  onChange: (references: ToolReferences) => void
  tools: string[]
}

/** Resolves the wire schemas of some tools and reports them through
 *  onChange as they arrive. The views mount one on the first sign of
 *  intent — hovering a schema affordance — so the data is usually here by
 *  the time a schema dialog opens. */
export type ToolReferenceLoader = ComponentType<ToolReferenceLoaderProps>

/** The seam between the instructions editor and whatever serves tool
 *  schemas: the console subscribes to the backend, a demo hands over
 *  fixtures. Undefined, the default, resolves nothing, so the schema
 *  dialogs simply never open. */
export const ToolReferenceContext = createContext<
  ToolReferenceLoader | undefined
>(undefined)

/** Whether a tool's schemas have arrived, gating dialog opens and driving
 *  the trigger's pending spinner. */
export function toolReferenceReady(
  references: ToolReferences | undefined,
  tool: string | undefined
) {
  return tool !== undefined && references?.[tool] !== undefined
}
