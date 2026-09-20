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
