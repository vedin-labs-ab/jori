"use node"

import { createHash } from "node:crypto"
import { concatenateBytes } from "../../shared/encoding"
import { type ArtifactTreeRecord, type NormalizedArtifactSourceFile } from "."

export function buildGitTreeSnapshot(files: NormalizedArtifactSourceFile[]) {
  const tree = buildTree(files)

  return {
    treeId: tree.id,
    trees: flattenTrees(tree),
  }
}

export function gitObjectId(kind: "blob" | "tree", bytes: Uint8Array) {
  return createHash("sha1")
    .update(`${kind} ${bytes.byteLength}\0`)
    .update(bytes)
    .digest("hex")
}

function buildTree(files: NormalizedArtifactSourceFile[]) {
  const root = createTreeNode()

  for (const file of files) {
    const segments = file.path.split("/")
    let current = root

    for (const segment of segments.slice(0, -1)) {
      current.children.set(
        segment,
        current.children.get(segment) ?? createTreeNode()
      )
      current = current.children.get(segment) ?? current
    }

    current.files.set(segments.at(-1) ?? file.path, file)
  }

  finalizeTree(root)

  return root
}

function createTreeNode(): MutableTreeNode {
  return {
    id: "",
    children: new Map(),
    files: new Map(),
  }
}

function finalizeTree(tree: MutableTreeNode) {
  for (const child of tree.children.values()) {
    finalizeTree(child)
  }

  tree.id = gitObjectId("tree", encodeTreeObject(treeEntries(tree)))
}

function flattenTrees(tree: MutableTreeNode): ArtifactTreeRecord[] {
  return [
    {
      id: tree.id,
      entries: treeEntries(tree).map((entry) => ({
        name: entry.name,
        mode: entry.kind,
        id: entry.id,
      })),
    },
    ...[...tree.children.values()].flatMap((child) => flattenTrees(child)),
  ]
}

function treeEntries(tree: MutableTreeNode) {
  const directoryEntries = [...tree.children].map(([name, child]) => ({
    gitMode: "40000",
    id: child.id,
    kind: "directory" as const,
    name,
  }))
  const fileEntries = [...tree.files].map(([name, file]) => ({
    gitMode: file.mode === "executable" ? "100755" : "100644",
    id: file.id,
    kind: file.mode,
    name,
  }))

  return [...directoryEntries, ...fileEntries].sort(compareTreeEntries)
}

function compareTreeEntries(
  left: { name: string; kind: string },
  right: { name: string; kind: string }
) {
  const leftName = left.kind === "directory" ? `${left.name}/` : left.name
  const rightName = right.kind === "directory" ? `${right.name}/` : right.name

  return leftName.localeCompare(rightName)
}

function encodeTreeObject(
  entries: Array<{ gitMode: string; name: string; id: string }>
) {
  const chunks: Uint8Array[] = []

  for (const entry of entries) {
    chunks.push(new TextEncoder().encode(`${entry.gitMode} ${entry.name}\0`))
    chunks.push(hexToBytes(entry.id))
  }

  return concatenateBytes(...chunks)
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }

  return bytes
}

type MutableTreeNode = {
  id: string
  children: Map<string, MutableTreeNode>
  files: Map<string, NormalizedArtifactSourceFile>
}
