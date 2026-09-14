import { availableName } from "../text"

/** Names are labels; automatic names avoid visible siblings. */
export function availableFolderName(names: Iterable<string>) {
  return availableName("New folder", names)
}

export const folderNameLimit = 120
