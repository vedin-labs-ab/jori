import { type JSONContent } from "@tiptap/core"
import { type ReactNode } from "react"
import { type JobPolicyPermissions } from "../../access/policy"
import {
  jobReferenceNodeName,
  jobSurfaceNodeName,
} from "../../editor/instructions/document"
import { serializedCodeSpanNodeName } from "../../editor/instructions/markdown/fence"
import { literalMarkdownMarkName } from "../../editor/instructions/markdown/literal"
import { fencedTextNodeName } from "../../editor/instructions/markdown/schema"
import { ReferenceMarker, SurfaceMarker } from "./markers"

// The editor's document as plain markup: each block in the element the
// editor renders it as, so the editor's styles carry over, and each
// mention as a static marker.

const blocks: Record<string, (children: ReactNode) => ReactNode> = {
  blockquote: (children) => <blockquote>{children}</blockquote>,
  bulletList: (children) => <ul>{children}</ul>,
  codeBlock: (children) => (
    <pre>
      <code>{children}</code>
    </pre>
  ),
  [fencedTextNodeName]: (children) => (
    <pre data-instruction-text="">
      <code>{children}</code>
    </pre>
  ),
  hardBreak: () => <br />,
  horizontalRule: () => <hr />,
  listItem: (children) => <li>{children}</li>,
  orderedList: (children) => <ol>{children}</ol>,
  paragraph: (children) => <p>{children}</p>,
}

export function InstructionNodes({
  nodes,
  permissions,
}: {
  nodes: JSONContent[]
  permissions: JobPolicyPermissions
}) {
  return nodes.map((node, index) => (
    <InstructionNode
      // biome-ignore lint/suspicious/noArrayIndexKey: the document is rendered once, as read, and never reorders
      key={index}
      node={node}
      permissions={permissions}
    />
  ))
}

function InstructionNode({
  node,
  permissions,
}: {
  node: JSONContent
  permissions: JobPolicyPermissions
}) {
  const children = (
    <InstructionNodes nodes={node.content ?? []} permissions={permissions} />
  )

  switch (node.type) {
    case "text":
      return <InstructionText node={node} />
    case "heading":
      return <Heading level={node.attrs?.level}>{children}</Heading>
    case jobSurfaceNodeName:
      return <SurfaceMarker node={node} permissions={permissions} />
    case jobReferenceNodeName:
      return <ReferenceMarker node={node} />
    case serializedCodeSpanNodeName:
      return <code>{String(node.attrs?.content ?? "")}</code>
    default:
      return blocks[node.type ?? ""]?.(children) ?? children
  }
}

function Heading({ children, level }: { children: ReactNode; level: unknown }) {
  switch (level) {
    case 1:
      return <h1>{children}</h1>
    case 2:
      return <h2>{children}</h2>
    case 3:
      return <h3>{children}</h3>
    case 4:
      return <h4>{children}</h4>
    case 5:
      return <h5>{children}</h5>
    default:
      return <h6>{children}</h6>
  }
}

/** A text run under its marks, innermost first. */
function InstructionText({ node }: { node: JSONContent }) {
  return (node.marks ?? []).reduce<ReactNode>(
    (content, mark) => markup(mark, content),
    node.text ?? ""
  )
}

function markup(
  mark: { attrs?: JSONContent["attrs"]; type: string },
  content: ReactNode
) {
  switch (mark.type) {
    case "bold":
      return <strong>{content}</strong>
    case "italic":
      return <em>{content}</em>
    case "code":
      return <code>{content}</code>
    case "link":
      return (
        <a
          href={String(mark.attrs?.href ?? "")}
          rel="noreferrer"
          target="_blank"
        >
          {content}
        </a>
      )
    case literalMarkdownMarkName:
      return <span data-markdown-literal="">{content}</span>
    default:
      return content
  }
}
