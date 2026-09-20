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

/** A resource or folder named by a message, reply part, or navigation. */
export type ReferenceTarget = { kind: ReferenceKind; id: string }

export function isReferenceKind(value: unknown): value is ReferenceKind {
  return referenceKinds.some((kind) => kind === value)
}
