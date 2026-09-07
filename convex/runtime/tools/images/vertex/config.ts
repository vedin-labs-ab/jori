import { requireEnvironmentVariable } from "../../../../shared/environment"
import { requireRegion } from "../../../../shared/origin"

export const imageModel = "gemini-3.1-flash-image"

export function vertexConfiguration() {
  const region = requireRegion()
  const project = requireEnvironmentVariable("VERTEX_PROJECT_ID")
  const clientEmail = requireEnvironmentVariable("VERTEX_CLIENT_EMAIL")
  const privateKey = requireEnvironmentVariable("VERTEX_PRIVATE_KEY")

  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) {
    throw new Error("VERTEX_PROJECT_ID must be a Google Cloud project ID.")
  }
  if (!clientEmail.endsWith(`@${project}.iam.gserviceaccount.com`)) {
    throw new Error(
      "Vertex service account must belong to its configured project."
    )
  }

  return {
    clientEmail,
    privateKey,
    endpoint: `https://aiplatform.${region}.rep.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${imageModel}:generateContent`,
  }
}
