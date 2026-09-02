import { useMemo } from "react"
import {
  type SharePages,
  type ShareRow,
} from "@/shared/console/materials/history"
import { useDemoWorkspace } from "./workspace"

/** A material's share links as the history view reads them: all of them
 *  at once, with nothing more to load. */
export function useDemoShares(materialId: string): SharePages<ShareRow> {
  const { state } = useDemoWorkspace()
  const results = state.shares[materialId]

  return useMemo(
    () => ({
      loadMore: () => undefined,
      results: results ?? [],
      status: "Exhausted",
    }),
    [results]
  )
}

/** Minting and revoking over the workspace, settled at once. */
export function useShareActions(
  materialId: string,
  kind: "table" | "store" | "file"
) {
  const { actions } = useDemoWorkspace()

  return {
    onMint: (expiresInHours: number) =>
      Promise.resolve(actions.mintShare(materialId, kind, expiresInHours)),
    onRevoke: (share: ShareRow) => {
      actions.revokeShare(materialId, share.shareId)

      return Promise.resolve()
    },
  }
}
