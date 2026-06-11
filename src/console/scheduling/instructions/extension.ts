import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import {
  getScheduleSurfaceLabel,
  isScheduleSurfaceProvider,
  type ScheduleSurfaceFormValue,
  type ScheduleSurfaceProvider,
} from "../surfaces"
import { scheduleSurfaceNodeName } from "./document"
import { ScheduleSurfaceNodeView } from "./node"

export type ScheduleSurfaceNodeAttrs = {
  access: ScheduleSurfaceFormValue["access"]
  provider: ScheduleSurfaceProvider
}

export const ScheduleSurfaceExtension = Node.create({
  name: scheduleSurfaceNodeName,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      access: {
        default: "",
        parseHTML: (element) =>
          parseScheduleSurfaceAccess(element.getAttribute("data-access")),
        renderHTML: (attributes) => ({
          "data-access": parseScheduleSurfaceAccess(attributes.access),
        }),
      },
      provider: {
        default: null,
        parseHTML: (element) =>
          parseScheduleSurfaceProvider(element.getAttribute("data-provider")),
        renderHTML: (attributes) => ({
          "data-provider": parseScheduleSurfaceProvider(attributes.provider),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-schedule-surface]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const provider = parseScheduleSurfaceProvider(node.attrs.provider)

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-schedule-surface": "",
      }),
      provider === null ? "" : getScheduleSurfaceLabel(provider),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ScheduleSurfaceNodeView)
  },
})

function parseScheduleSurfaceProvider(provider: unknown) {
  return isScheduleSurfaceProvider(provider) ? provider : null
}

function parseScheduleSurfaceAccess(
  access: unknown
): ScheduleSurfaceFormValue["access"] {
  return access === "read" || access === "write" || access === "both"
    ? access
    : ""
}
