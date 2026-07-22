import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"

export type ArtifactListResult = NonNullable<
  FunctionReturnType<typeof api.artifacts.console.list>
>

export type ArtifactSummary = Extract<
  ArtifactListResult,
  { status: "ready" }
>["artifacts"][number]

type ArtifactDetailResult = NonNullable<
  FunctionReturnType<typeof api.artifacts.console.get>
>

export type ArtifactDetail = NonNullable<
  Extract<ArtifactDetailResult, { status: "ready" }>["artifact"]
>
