import { createFileRoute } from "@tanstack/react-router"
import { Runs } from "@/console/runs"

// `run` deep-links to a single run: the list opens and scrolls to that row.
export const Route = createFileRoute("/runs")({
  validateSearch: (search): { run?: string } =>
    typeof search.run === "string" && search.run !== ""
      ? { run: search.run }
      : {},
  component: Runs,
})
