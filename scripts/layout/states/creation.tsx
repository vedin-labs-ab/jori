import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody } from "@/components/ui/table"
import { useDemoWorkspace } from "@/landing/demo/workspace"
import { EditingProvider } from "@/shared/console/edit/provider"
import { CreatedItemRow } from "@/shared/console/edit/row"
import { useCreatedItem, useEditing } from "@/shared/console/edit/state"

/** The real immediate creation session, with a delayed local service result. */
export function CreationState({ state }: { state: string }) {
  const attempts = useRef(0)
  const { actions } = useDemoWorkspace()
  return (
    <EditingProvider
      name={() => "New table"}
      onCreate={async () => {
        const attempt = attempts.current++
        await new Promise((resolve) => setTimeout(resolve, 1100))
        if (state === "create-error" && attempt === 0) {
          throw new Error("Layout fixture simulated creation failure")
        }
        const material = actions.createMaterial("table", {
          name: "New table",
          visibility: { mode: "organization" },
        })
        return { id: material.id, name: material.name, kind: "table" }
      }}
      onRename={async (item, name) => actions.updateMaterial(item.id, { name })}
    >
      <CreationControls />
    </EditingProvider>
  )
}

function CreationControls() {
  const editing = useEditing()
  const created = useCreatedItem("list")
  return (
    <div className="grid gap-4 p-6">
      <Button onClick={() => editing?.create("table", undefined, "list")}>
        New table
      </Button>
      <Table>
        <TableBody>
          {created ? (
            <CreatedItemRow edit={created}>{null}</CreatedItemRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
