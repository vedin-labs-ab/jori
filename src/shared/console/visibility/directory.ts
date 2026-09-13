import { type Visibility } from "@contracts/visibility"
import { createContext, useContext } from "react"

export type VisibilityDirectory = {
  viewerId?: string
  people?: readonly { id: string; name: string }[]
  teams?: readonly { id: string; name: string }[]
  folders?: readonly {
    folderId: string
    parentId?: string
    name: string
    visibility: Visibility
  }[]
}

/** Shared names, never a second implementation of access checks. The
 * access dialog resolves the actual audience on the server. */
export const VisibilityDirectoryContext = createContext<VisibilityDirectory>({})
export const useVisibilityDirectory = () =>
  useContext(VisibilityDirectoryContext)
