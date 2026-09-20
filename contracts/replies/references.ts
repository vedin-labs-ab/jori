// Shared by route parsing and reply validation without loading the validator.
export const referenceKinds = [
  "file",
  "table",
  "store",
  "job",
  "folder",
  "run",
  "chat",
] as const

export type ReferenceKind = (typeof referenceKinds)[number]

/** The resource or folder a message was opened about or mentions. */
export type MessageContext = { kind: ReferenceKind; id: string }
