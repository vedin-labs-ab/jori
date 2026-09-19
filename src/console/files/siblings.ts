import { useMemo } from "react"
import {
  type FileSiblings,
  fileSiblings,
  noSiblings,
} from "@/shared/console/files/siblings"
import { type FileRow } from "@/shared/console/files/types"
import { useFiles } from "./query"

/** The current file's neighbors, read off the same list query the files
 *  page subscribes to. */
export function useFileSiblings(
  organizationId: string,
  fileId: FileRow["fileId"]
): FileSiblings {
  const files = useFiles(organizationId)

  return useMemo(
    () => (files === undefined ? noSiblings : fileSiblings(files, fileId)),
    [files, fileId]
  )
}
