import { type Dirent } from "node:fs"
import path from "node:path"

/**
 * Markdown has a few homes, and nowhere else: the guides an agent reads
 * before a kind of work, the prompts and skills the product runs on, the
 * legal pages the site serves, and the files a repository root carries.
 * A note written beside the code it describes goes stale the moment the
 * code moves, so the check refuses it rather than trusting the next
 * reader to notice.
 */
const rootDocuments = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE.md",
  "NOTICE.md",
  "README.md",
  "SECURITY.md",
])
const documentRoots = ["prompts", "skills", "src/landing/legal"]

export function isAllowedDocument(relativePath: string) {
  const segments = relativePath.split("/")

  if (segments.length === 1) {
    return rootDocuments.has(relativePath)
  }
  if (segments.length === 2 && segments[0] === "guides") {
    return true
  }

  return documentRoots.some((root) => relativePath.startsWith(`${root}/`))
}

export function findDocumentViolations(directory: string, entries: Dirent[]) {
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === ".md")
    .map((entry) =>
      directory === "." ? entry.name : path.posix.join(directory, entry.name)
    )
    .filter((relativePath) => !isAllowedDocument(relativePath))
}

export function formatDocumentViolation(relativePath: string) {
  return `- ${relativePath}`
}
