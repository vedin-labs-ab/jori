import { type Visibility } from "@contracts/visibility"
import { ancestorFolderIds } from "@/shared/console/folders/tree"
import { type ResolvedAudience } from "@/shared/console/visibility/audience"
import { type DemoPerson, people } from "../fixtures/people"
import { type FolderId, type PersonId } from "../fixtures/types"
import { type DemoState, type VisibilityTarget } from "../state/types"
import { folderOf } from "./folders"
import { materialOf } from "./materials"

// Who a visibility actually reaches once the folders above it have had
// their say, resolved the way the backend resolves it: every gate on the
// way up must admit the person, and an owner always sees their own.

type Gate = { owner: PersonId | undefined; visibility: Visibility }

/** What an audience is resolved for: something in the workspace, or a
 *  draft not in it yet, filed (or not) in a folder. */
export type AudienceTarget =
  | VisibilityTarget
  | { kind: "draft"; folderId: string | null }

export function resolveAudience(
  state: DemoState,
  target: AudienceTarget,
  visibility: Visibility
): ResolvedAudience {
  const chain = folderChain(state, target)
  const gates: Gate[] = [
    { owner: ownerOf(state, target), visibility },
    ...chain.map((folder) => ({
      owner: folder.createdBy,
      visibility: folder.visibility,
    })),
  ]
  const narrowing = chain.find(
    (folder) => folder.visibility.mode !== "organization"
  )

  return {
    people: people
      .filter(
        (person) =>
          person.id === gates[0]?.owner ||
          gates.every((gate) => admits(gate, person))
      )
      .map((person) => ({
        personId: person.id,
        name: person.name,
        image: undefined,
      })),
    memberCount: people.length,
    narrowedBy: narrowing?.name ?? null,
  }
}

/** The folders above the target, nearest first. */
function folderChain(state: DemoState, target: AudienceTarget) {
  const filedIn = filedFolderId(state, target)
  const ids =
    target.kind === "folder"
      ? ancestorFolderIds(state.folders, target.id)
      : filedIn === undefined
        ? []
        : [filedIn, ...ancestorFolderIds(state.folders, filedIn)]

  return ids.flatMap((id) => {
    const folder = folderOf(state, id)

    return folder === undefined ? [] : [folder]
  })
}

function filedFolderId(
  state: DemoState,
  target: AudienceTarget
): FolderId | undefined {
  if (target.kind === "draft") {
    return (target.folderId as FolderId | null) ?? undefined
  }

  if (target.kind === "job") {
    return state.jobs.find((job) => job.id === target.id)?.folderId
  }

  if (target.kind === "chat") {
    return state.chat.conversations.find((chat) => chat.id === target.id)
      ?.folderId
  }

  return materialOf(state, target.id)?.folderId
}

function ownerOf(state: DemoState, target: AudienceTarget) {
  if (target.kind === "folder") {
    return folderOf(state, target.id)?.createdBy
  }

  if (target.kind === "job" || target.kind === "draft") {
    return undefined
  }

  if (target.kind === "chat") {
    return state.chat.conversations.find((chat) => chat.id === target.id)
      ?.createdBy
  }

  return materialOf(state, target.id)?.ownerId
}

function admits(gate: Gate, person: DemoPerson) {
  if (gate.owner === person.id) {
    return true
  }

  switch (gate.visibility.mode) {
    case "private":
      return false
    case "people":
      return gate.visibility.personIds.some((id) => id === person.id)
    case "teams":
      return gate.visibility.teamIds.some((id) => person.teamIds.includes(id))
    case "organization":
      return true
  }
}
