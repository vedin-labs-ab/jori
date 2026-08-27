import { createFileRoute } from "@tanstack/react-router"
import { type GenericId } from "convex/values"
import { TableView } from "@/console/tables/detail"

export const Route = createFileRoute("/tables/$tableId")({
  component: TableRoute,
})

function TableRoute() {
  const { tableId } = Route.useParams()

  return <TableView tableId={tableId as GenericId<"tables">} />
}
