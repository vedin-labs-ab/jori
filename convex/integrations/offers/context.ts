import { type Doc } from "../../_generated/dataModel"
import { type AgentRuntimeInput } from "../../runs/agent/input"

export type OfferContext = {
  connectedIntegrations: Doc<"integrations">[]
  input: AgentRuntimeInput
  run: Doc<"runs">
}
