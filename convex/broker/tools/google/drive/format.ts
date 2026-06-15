import {
  optionalString,
  optionalStringArray,
  requiredString,
} from "../../common"

export const driveFilesUrl = "https://www.googleapis.com/drive/v3/files"
export const driveUploadFilesUrl =
  "https://www.googleapis.com/upload/drive/v3/files"
export const driveFileFields = [
  "id",
  "name",
  "mimeType",
  "webViewLink",
  "webContentLink",
  "iconLink",
  "createdTime",
  "modifiedTime",
  "size",
  "md5Checksum",
  "parents",
  "trashed",
  "owners(displayName,emailAddress)",
].join(",")
export const defaultTextMimeType = "text/plain"

export function driveFileMetadataUrl(args: Record<string, unknown>) {
  const url = new URL(
    `${driveFilesUrl}/${encodeURIComponent(requiredString(args.fileId, "fileId"))}`
  )
  url.searchParams.set("fields", driveFileFields)
  setOptionalBooleanSearchParam(
    url,
    "supportsAllDrives",
    args.supportsAllDrives
  )

  return url.toString()
}

export function createDriveFileMetadata(
  args: Record<string, unknown>,
  mimeType: string
) {
  return withOptionalParents(
    {
      name: requiredString(args.name, "name"),
      mimeType,
    },
    args.parents
  )
}

export function createDriveFileUpdateMetadata(args: Record<string, unknown>) {
  const metadata: Record<string, unknown> = {}
  const name = optionalString(args.name)
  const mimeType = optionalString(args.mimeType)

  if (name !== undefined) {
    metadata.name = name
  }

  if (mimeType !== undefined) {
    metadata.mimeType = mimeType
  }

  return metadata
}

export function setDriveQuery(
  url: URL,
  args: {
    includeTrashed: unknown
    q: unknown
  }
) {
  const q = optionalString(args.q)

  if (args.includeTrashed === true) {
    if (q !== undefined) {
      url.searchParams.set("q", q)
    }
    return
  }

  url.searchParams.set(
    "q",
    q === undefined ? "trashed=false" : `${q} and trashed=false`
  )
}

export function createMultipartBody(args: {
  content: string
  metadata: Record<string, unknown>
  mimeType: string
}) {
  const boundary = `milo_drive_${crypto.randomUUID().replaceAll("-", "")}`

  return {
    contentType: `multipart/related; boundary=${boundary}`,
    body: [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(args.metadata),
      `--${boundary}`,
      `Content-Type: ${args.mimeType}`,
      "",
      args.content,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  }
}

export function isGoogleWorkspaceFile(mimeType: string | undefined) {
  return mimeType?.startsWith("application/vnd.google-apps.") ?? false
}

export function requiredText(value: unknown, name: string) {
  if (typeof value !== "string") {
    throw new Error(`${name} is required`)
  }

  return value
}

export function optionalText(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export function setOptionalBooleanSearchParam(
  url: URL,
  key: string,
  value: unknown
) {
  if (typeof value === "boolean") {
    url.searchParams.set(key, String(value))
  }
}

export function readObject(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

export function readString(value: Record<string, unknown>, key: string) {
  const nested = value[key]

  return typeof nested === "string" ? nested : undefined
}

function withOptionalParents(
  metadata: Record<string, unknown>,
  value: unknown
) {
  const parents = optionalStringArray(value)

  return parents.length === 0 ? metadata : { ...metadata, parents }
}
