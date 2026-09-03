import { type MaterialRemoval } from "../removal"
import { MaterialRowMenu } from "./menu"

// The row menu a table or store list gives every row, over the actions
// the page binds.

/** What a table or store list's rows can ask of the page. */
export type MaterialListActions<Row> = {
  onAccess: (row: Row) => void
  onEdit: (row: Row) => void
  onMoveToFolder: (row: Row) => void
  removal: MaterialRemoval<Row>
}

/** The material row menu over a page's actions, for a kind's `menu`. */
export function materialRowMenu<
  Row extends { archivedAt?: number; name: string },
>(
  kind: {
    deleteDescription: string
    identify: (row: Row) => string
    noun: string
  },
  actions: MaterialListActions<Row>
) {
  return (row: Row) => {
    const id = kind.identify(row)

    return (
      <MaterialRowMenu
        deleteDescription={kind.deleteDescription}
        isDeleting={actions.removal.removingId === id}
        isRestoring={actions.removal.restoringId === id}
        material={{ name: row.name, archivedAt: row.archivedAt }}
        noun={kind.noun}
        onAccess={() => actions.onAccess(row)}
        onDelete={() => void actions.removal.removeMaterial(row)}
        onEdit={() => actions.onEdit(row)}
        onMoveToFolder={() => actions.onMoveToFolder(row)}
        onRestore={() => void actions.removal.restoreMaterial(row)}
      />
    )
  }
}
