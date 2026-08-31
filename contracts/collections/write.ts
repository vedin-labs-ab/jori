import { mergePatch, pathPatch, readPath } from "../json"

/** How a collection document changes: replace the document, merge an
 *  RFC 7396-style patch into it, or claim a path. */
export type DocumentWrite =
  | { type: "replace"; value: unknown }
  | { type: "merge"; patch: unknown }
  | { type: "claim"; path: string[]; value: unknown }

type ResolvedDocumentWrite =
  | { kind: "write"; value: unknown }
  | { kind: "held"; existing: unknown }

/** Resolve a write against the current document. A claim is an atomic
 *  insert-if-absent: it sets its path only when nothing is stored there yet,
 *  which is what makes at-most-once delivery possible on top of stores. */
export function resolveDocumentWrite(
  current: unknown,
  write: DocumentWrite
): ResolvedDocumentWrite {
  if (write.type === "replace") {
    return { kind: "write", value: write.value }
  }

  if (write.type === "merge") {
    return { kind: "write", value: mergePatch(current ?? {}, write.patch) }
  }

  if (write.path.length === 0 || write.value == null) {
    throw new Error("A claim requires a non-empty path and a non-null value.")
  }

  const existing = readPath(current, write.path)

  return existing !== undefined
    ? { kind: "held", existing }
    : {
        kind: "write",
        value: mergePatch(current ?? {}, pathPatch(write.path, write.value)),
      }
}
