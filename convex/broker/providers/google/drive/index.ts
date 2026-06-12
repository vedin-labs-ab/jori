import {
  boundedNumber,
  optionalString,
  requiredString,
  setOptionalSearchParam,
} from "../../common"
import {
  createDriveFileMetadata,
  createDriveFileUpdateMetadata,
  createMultipartBody,
  defaultTextMimeType,
  driveFileFields,
  driveFileMetadataUrl,
  driveFilesUrl,
  driveUploadFilesUrl,
  isGoogleWorkspaceFile,
  optionalText,
  readObject,
  readString,
  requiredText,
  setDriveQuery,
  setOptionalBooleanSearchParam,
} from "./format"
import { googleJson, googleMultipartJson, googleText } from "../request"

export async function callGoogleDriveTool(
  token: string,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "google_drive_search_files") {
    return await searchDriveFiles(token, args)
  }

  if (tool === "google_drive_get_file") {
    return await getDriveFile(token, args)
  }

  if (tool === "google_drive_read_file") {
    return await readDriveFile(token, args)
  }

  if (tool === "google_drive_create_file") {
    return await createDriveFile(token, args)
  }

  if (tool === "google_drive_update_file") {
    return await updateDriveFile(token, args)
  }

  throw new Error(`Unknown Google Drive tool: ${tool}`)
}

async function searchDriveFiles(token: string, args: Record<string, unknown>) {
  const url = new URL(driveFilesUrl)
  url.searchParams.set(
    "pageSize",
    String(boundedNumber(args.pageSize, 10, 1, 100))
  )
  url.searchParams.set("fields", `nextPageToken,files(${driveFileFields})`)
  url.searchParams.set("spaces", optionalString(args.spaces) ?? "drive")
  setOptionalSearchParam(url, "corpora", args.corpora)
  setOptionalSearchParam(url, "driveId", args.driveId)
  setOptionalSearchParam(url, "orderBy", args.orderBy)
  setOptionalSearchParam(url, "pageToken", args.pageToken)
  setOptionalBooleanSearchParam(
    url,
    "includeItemsFromAllDrives",
    args.includeItemsFromAllDrives
  )
  setOptionalBooleanSearchParam(
    url,
    "supportsAllDrives",
    args.supportsAllDrives
  )
  setDriveQuery(url, {
    includeTrashed: args.includeTrashed,
    q: args.q,
  })

  return await googleJson(token, url.toString())
}

async function getDriveFile(token: string, args: Record<string, unknown>) {
  return await googleJson(token, driveFileMetadataUrl(args))
}

async function readDriveFile(token: string, args: Record<string, unknown>) {
  const file = await getDriveFile(token, args)
  const fileRecord = readObject(file)
  const mimeType = readString(fileRecord, "mimeType")
  const exportMimeType =
    optionalString(args.exportMimeType) ?? defaultTextMimeType
  const content = isGoogleWorkspaceFile(mimeType)
    ? await exportDriveFile(token, args, exportMimeType)
    : await downloadDriveFile(token, args)
  const maxCharacters = boundedNumber(args.maxCharacters, 200_000, 1, 200_000)

  return {
    file,
    mimeType: isGoogleWorkspaceFile(mimeType)
      ? exportMimeType
      : (mimeType ?? defaultTextMimeType),
    content: content.slice(0, maxCharacters),
    truncated: content.length > maxCharacters,
  }
}

async function createDriveFile(token: string, args: Record<string, unknown>) {
  const mimeType = optionalString(args.mimeType) ?? defaultTextMimeType
  const url = new URL(driveUploadFilesUrl)
  url.searchParams.set("uploadType", "multipart")
  url.searchParams.set("fields", driveFileFields)
  setOptionalBooleanSearchParam(
    url,
    "supportsAllDrives",
    args.supportsAllDrives
  )

  return await googleMultipartJson(token, url.toString(), {
    method: "POST",
    ...createMultipartBody({
      content: requiredText(args.content, "content"),
      metadata: createDriveFileMetadata(args, mimeType),
      mimeType,
    }),
  })
}

async function updateDriveFile(token: string, args: Record<string, unknown>) {
  const content = optionalText(args.content)
  const mimeType = optionalString(args.mimeType) ?? defaultTextMimeType
  const metadata = createDriveFileUpdateMetadata(args)

  if (content === undefined && Object.keys(metadata).length === 0) {
    throw new Error("Provide content, name, or mimeType to update")
  }

  if (content === undefined) {
    return await googleJson(token, driveFileMetadataUrl(args), {
      method: "PATCH",
      body: metadata,
    })
  }

  const url = new URL(
    `${driveUploadFilesUrl}/${encodeURIComponent(requiredString(args.fileId, "fileId"))}`
  )
  url.searchParams.set("uploadType", "multipart")
  url.searchParams.set("fields", driveFileFields)
  setOptionalBooleanSearchParam(
    url,
    "supportsAllDrives",
    args.supportsAllDrives
  )

  return await googleMultipartJson(token, url.toString(), {
    method: "PATCH",
    ...createMultipartBody({
      content,
      metadata,
      mimeType,
    }),
  })
}

async function downloadDriveFile(token: string, args: Record<string, unknown>) {
  const url = new URL(
    `${driveFilesUrl}/${encodeURIComponent(requiredString(args.fileId, "fileId"))}`
  )
  url.searchParams.set("alt", "media")
  setOptionalBooleanSearchParam(
    url,
    "supportsAllDrives",
    args.supportsAllDrives
  )

  return await googleText(token, url.toString())
}

async function exportDriveFile(
  token: string,
  args: Record<string, unknown>,
  mimeType: string
) {
  const url = new URL(
    `${driveFilesUrl}/${encodeURIComponent(requiredString(args.fileId, "fileId"))}/export`
  )
  url.searchParams.set("mimeType", mimeType)

  return await googleText(token, url.toString())
}
