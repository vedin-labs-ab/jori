import { type QueryLikeCtx } from "../../shared/context"
import { sha256Hex } from "../../shared/crypto"
import { type Sight } from "../../visibility/sight"
import { history } from "./history"
import { material } from "./materials"
import { type Projection } from "./types"
export async function project(
  ctx: QueryLikeCtx,
  key: string,
  sight?: Sight
): Promise<Projection | null> {
  const separator = key.indexOf(":")
  if (separator < 0) {
    return null
  }
  const table = key.slice(0, separator),
    id = key.slice(separator + 1)
  const source =
    (await material(ctx, table, id, sight)) ??
    (await history(ctx, table, id, sight))
  if (!source) {
    return null
  }
  // Gate stores only access policy, never the whole underlying row.
  const gate = {
    organizationId: source.organizationId,
    visibility: source.gate.visibility,
    ...(source.gate.ownerId ? { ownerId: source.gate.ownerId } : {}),
    ...(source.gate.folderId ? { folderId: source.gate.folderId } : {}),
  }
  const { updatedAt: _updatedAt, ...content } = { ...source, gate }
  return { ...source, gate, revision: await sha256Hex(JSON.stringify(content)) }
}
