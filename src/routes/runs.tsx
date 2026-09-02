import { createFileRoute } from "@tanstack/react-router"
import { Runs } from "@/console/runs"
import { consoleDocumentTitle } from "@/shared/console/shell/routes"

// `run` deep-links to a single run: the list opens and scrolls to that row.
// `page` survives refreshes; it is absent on the first page.
export const Route = createFileRoute("/runs")({
  validateSearch: (search): { run?: string; page?: number } => ({
    ...(typeof search.run === "string" && search.run !== ""
      ? { run: search.run }
      : {}),
    ...(typeof search.page === "number" &&
    Number.isInteger(search.page) &&
    search.page > 1
      ? { page: search.page }
      : {}),
  }),
  component: Runs,
  head: () => ({ meta: [{ title: consoleDocumentTitle("/runs") }] }),
})
