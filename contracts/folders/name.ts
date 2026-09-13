/** Names are labels, not identity. Only automatically chosen names avoid
 *  visible siblings; people can still explicitly choose duplicate names. */
export function availableFolderName(names: Iterable<string>) {
  const used = new Set(Array.from(names, (name) => name.trim().toLowerCase()))
  let suffix = 0

  while (used.has(suffix === 0 ? "new folder" : `new folder ${suffix}`)) {
    suffix += 1
  }

  return suffix === 0 ? "New folder" : `New folder ${suffix}`
}

export const folderNameLimit = 120
