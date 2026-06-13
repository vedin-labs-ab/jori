import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { type AutomationPolicyPermissions } from "../../policy"
import {
  type AutomationSurfaceProvider,
  getAutomationSurfaceLabel,
  isAutomationSurfaceProvider,
} from "../../surfaces"
import {
  type AutomationSurfacePolicyState,
  automationSurfaceNodeName,
  automationSurfacePolicyStates,
} from "./document"
import { AutomationSurfaceNodeView } from "./node"

export type AutomationSurfaceNodeAttrs = {
  policy: AutomationSurfacePolicyState
  provider: AutomationSurfaceProvider
  tools: string[]
}

export type AutomationSurfaceExtensionOptions = {
  getPermissions: () => AutomationPolicyPermissions
}

export const AutomationSurfaceExtension =
  Node.create<AutomationSurfaceExtensionOptions>({
    name: automationSurfaceNodeName,
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addOptions() {
      return {
        getPermissions: () => undefined,
      }
    },

    addAttributes() {
      return {
        provider: {
          default: null,
          parseHTML: (element) =>
            parseAutomationSurfaceProvider(
              element.getAttribute("data-provider")
            ),
          renderHTML: (attributes) => ({
            "data-provider": parseAutomationSurfaceProvider(
              attributes.provider
            ),
          }),
        },
        tools: {
          default: [],
          parseHTML: (element) =>
            parseAutomationSurfaceTools(element.getAttribute("data-tools")),
          renderHTML: (attributes) => ({
            "data-tools": parseAutomationSurfaceTools(attributes.tools).join(
              ","
            ),
          }),
        },
        policy: {
          default: "allowed",
          parseHTML: (element) =>
            parseAutomationSurfacePolicy(element.getAttribute("data-policy")),
          renderHTML: (attributes) => ({
            "data-policy": parseAutomationSurfacePolicy(attributes.policy),
          }),
        },
      }
    },

    parseHTML() {
      return [{ tag: "span[data-automation-surface]" }]
    },

    renderHTML({ HTMLAttributes, node }) {
      const provider = parseAutomationSurfaceProvider(node.attrs.provider)

      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          "data-automation-surface": "",
        }),
        provider === null ? "" : getAutomationSurfaceLabel(provider),
      ]
    },

    addNodeView() {
      return ReactNodeViewRenderer(AutomationSurfaceNodeView)
    },
  })

function parseAutomationSurfaceProvider(provider: unknown) {
  return isAutomationSurfaceProvider(provider) ? provider : null
}

function parseAutomationSurfacePolicy(
  policy: unknown
): AutomationSurfacePolicyState {
  return automationSurfacePolicyStates.some((state) => state === policy)
    ? (policy as AutomationSurfacePolicyState)
    : "allowed"
}

function parseAutomationSurfaceTools(tools: unknown) {
  if (Array.isArray(tools)) {
    return tools.filter((tool): tool is string => typeof tool === "string")
  }

  if (typeof tools === "string") {
    return tools.split(",").filter((tool) => tool !== "")
  }

  return []
}
