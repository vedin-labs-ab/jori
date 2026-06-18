import fs from "node:fs"
import path from "node:path"

export function listFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    return entry.isDirectory() ? listFiles(entryPath) : [entryPath]
  })

  return files.sort((left, right) => left.localeCompare(right))
}

export function normalizePath(filePath: string) {
  return filePath.split(path.sep).join("/")
}

export function sortRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
  )
}
