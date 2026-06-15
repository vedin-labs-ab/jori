import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import {
  type AutomationSurfaceIntegration,
  getAutomationSurfaceLabel,
} from "../../../access"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { AutomationSurfaceNodeView } from "../access/node"
import {
  type AutomationSurfacePolicyState,
  automationSurfaceNodeName,
  parseAutomationSurfaceIntegration,
  parseAutomationSurfacePolicy,
  parseAutomationSurfaceToolsAttribute,
} from "../document"

export type AutomationSurfaceNodeAttrs = {
  policy: AutomationSurfacePolicyState
  provider: AutomationSurfaceIntegration
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
            parseAutomationSurfaceIntegration(
              element.getAttribute("data-provider")
            ),
          renderHTML: (attributes) => ({
            "data-provider": parseAutomationSurfaceIntegration(
              attributes.provider
            ),
          }),
        },
        tools: {
          default: [],
          parseHTML: (element) =>
            parseAutomationSurfaceToolsAttribute(
              element.getAttribute("data-tools")
            ),
          renderHTML: (attributes) => ({
            "data-tools": parseAutomationSurfaceToolsAttribute(
              attributes.tools
            ).join(","),
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
      const provider = parseAutomationSurfaceIntegration(node.attrs.provider)

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
