import { createFileRoute } from "@tanstack/react-router"
import { type ArtifactDetail } from "@/console/artifacts/types"
import { ArtifactView } from "@/console/artifacts/view"

export const Route = createFileRoute("/artifacts/$artifactId/")({
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { artifactId } = Route.useParams()

  return (
    <ArtifactView artifactId={artifactId as ArtifactDetail["artifactId"]} />
  )
}
