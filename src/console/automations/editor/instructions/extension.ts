import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import {
  type AutomationReadScope,
  type AutomationSurfaceFormValue,
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
  access: AutomationSurfaceFormValue["access"]
  policy: AutomationSurfacePolicyState
  provider: AutomationSurfaceProvider
}

export type AutomationSurfaceExtensionOptions = {
  getReadScope: () => AutomationReadScope
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
        getReadScope: () => "selected",
      }
    },

    addAttributes() {
      return {
        access: {
          default: "",
          parseHTML: (element) =>
            parseAutomationSurfaceAccess(element.getAttribute("data-access")),
          renderHTML: (attributes) => ({
            "data-access": parseAutomationSurfaceAccess(attributes.access),
          }),
        },
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

function parseAutomationSurfaceAccess(
  access: unknown
): AutomationSurfaceFormValue["access"] {
  return access === "read" || access === "write" || access === "both"
    ? access
    : ""
}

function parseAutomationSurfacePolicy(
  policy: unknown
): AutomationSurfacePolicyState {
  return automationSurfacePolicyStates.some((state) => state === policy)
    ? (policy as AutomationSurfacePolicyState)
    : "allowed"
}
