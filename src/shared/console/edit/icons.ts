import { Database, File, Folder, Table2 } from "lucide-react"

/** A file's row knows its own kind's icon and hands it in; this is the
 *  one it falls back to. */
export const editIcons = {
  file: File,
  folder: Folder,
  store: Database,
  table: Table2,
}
