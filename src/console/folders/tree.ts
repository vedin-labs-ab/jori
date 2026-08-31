// Pure tree arithmetic over the flat folder list the backend returns.
// The sidebar, the picker, and the move dialog all lean on these helpers,
// so they stay free of React and Convex types.

export type FolderSummary = {
  folderId: string
  name: string
  parentId?: string
}

export type FolderNode<Row extends FolderSummary = FolderSummary> = Row & {
  children: FolderNode<Row>[]
}

/** Nest the flat list into a tree. A folder whose parent is missing from
 *  the list is treated as a root, and every level is name-sorted. */
export function buildFolderTree<Row extends FolderSummary>(
  rows: readonly Row[]
): FolderNode<Row>[] {
  const nodes = new Map<string, FolderNode<Row>>(
    rows.map((row) => [row.folderId, { ...row, children: [] }])
  )
  const roots: FolderNode<Row>[] = []

  for (const node of nodes.values()) {
    const parent =
      node.parentId === undefined ? undefined : nodes.get(node.parentId)

    if (parent === undefined || parent === node) {
      roots.push(node)
    } else {
      parent.children.push(node)
    }
  }

  sortByName(roots)

  return roots
}

/** The folder itself plus every descendant — the drop targets a folder
 *  move must disable, because moving under them would create a cycle. */
export function subtreeFolderIds(
  rows: readonly FolderSummary[],
  folderId: string
): ReadonlySet<string> {
  const childIds = new Map<string, string[]>()

  for (const row of rows) {
    if (row.parentId !== undefined) {
      const siblings = childIds.get(row.parentId) ?? []

      siblings.push(row.folderId)
      childIds.set(row.parentId, siblings)
    }
  }

  const subtree = new Set<string>()
  const queue = [folderId]

  while (queue.length > 0) {
    const current = queue.pop()

    if (current === undefined || subtree.has(current)) {
      continue
    }

    subtree.add(current)
    queue.push(...(childIds.get(current) ?? []))
  }

  return subtree
}

/** The folder's ancestors, nearest first — the rows the sidebar expands so
 *  the active folder is visible. Cycles and missing parents end the walk. */
export function ancestorFolderIds(
  rows: readonly FolderSummary[],
  folderId: string
): string[] {
  const byId = new Map(rows.map((row) => [row.folderId, row]))
  const ancestors: string[] = []
  const seen = new Set([folderId])
  let parentId = byId.get(folderId)?.parentId

  while (parentId !== undefined && !seen.has(parentId)) {
    ancestors.push(parentId)
    seen.add(parentId)
    parentId = byId.get(parentId)?.parentId
  }

  return ancestors
}

/** The folder a console path is about, across both of its tabs. The usage
 *  overview shares the surface but is nobody's folder, so it reads as none. */
export function activeFolderId(pathname: string) {
  const folderId = /^\/folders\/([^/]+)(?:\/usage)?$/.exec(pathname)?.[1]

  return folderId === "usage" ? undefined : folderId
}

function sortByName(nodes: FolderNode<FolderSummary>[]) {
  nodes.sort((left, right) => left.name.localeCompare(right.name))

  for (const node of nodes) {
    sortByName(node.children)
  }
}
