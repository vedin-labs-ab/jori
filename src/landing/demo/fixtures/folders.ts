import { day, hour, minute } from "./clock"
import { demoId } from "./ids"
import { personId, teamIds } from "./people"
import { type DemoFolder } from "./types"

export function folderId(name: string) {
  return demoId("folders", name)
}

/** Copperline's tree: one folder per team, with Finance narrowed to its
 *  own team and Renewals filed inside it. */
export function demoFolders(now: number): DemoFolder[] {
  return [
    folder(
      "engineering",
      "Engineering",
      "jonas",
      now - 40 * day,
      now - 3 * day
    ),
    folder("marketing", "Marketing", "ida", now - 38 * day, now - day),
    {
      ...folder("finance", "Finance", "maya", now - 37 * day, now - 4 * hour),
      visibility: { mode: "teams", teamIds: [teamIds.finance] },
    },
    {
      ...folder(
        "renewals",
        "Renewals",
        "maya",
        now - 30 * day,
        now - 3 * minute
      ),
      parentId: folderId("finance"),
    },
    folder("design", "Design", "hanna", now - 20 * day, now - 2 * day),
  ]
}

function folder(
  key: string,
  name: string,
  owner: string,
  createdAt: number,
  updatedAt: number
): DemoFolder {
  return {
    folderId: folderId(key),
    name,
    parentId: undefined,
    visibility: { mode: "organization" },
    createdBy: personId(owner),
    createdAt,
    updatedAt,
  }
}
