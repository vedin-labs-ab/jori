import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type FileDetail, type FileRow } from "@/shared/console/files/types"
import { useAcrossEpochs, useUrlEpoch } from "@/shared/files/epoch"
import { api } from "../../../convex/_generated/api"

/** The organization's files, their signed URLs kept current. */
export function useFiles(organizationId: string): FileRow[] | undefined {
  const epoch = useUrlEpoch()

  return useAcrossEpochs(
    useQuery(api.files.console.list, { organizationId, epoch }),
    organizationId
  )
}

/** One file, its signed URL kept current; no `fileId` asks for nothing. */
export function useFile(
  organizationId: string,
  fileId: string | undefined
):
  | { status: "ready"; file: FileDetail }
  | { status: "not_found"; file: null }
  | undefined {
  const epoch = useUrlEpoch()

  return useAcrossEpochs(
    useQuery(
      api.files.console.get,
      fileId === undefined
        ? "skip"
        : { organizationId, fileId: fileId as GenericId<"files">, epoch }
    ),
    `${organizationId}:${fileId}`
  )
}
