import { type ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api"
import { type AgentRunStatus, type ConvexId } from "../types"

export async function createAgentRun(
  client: ConvexHttpClient,
  secret: string,
  args: {
    parentId: ConvexId<"runs">
    task: string
    title: string
    tools?: string[]
  }
) {
  return await client.action(api.runtime.agents.create, { ...args, secret })
}

export async function readAgentRuns(
  client: ConvexHttpClient,
  secret: string,
  args: {
    parentId: ConvexId<"runs">
    runIds: ConvexId<"runs">[]
  }
) {
  return (await client.query(api.runtime.agents.readChildren, {
    ...args,
    secret,
  })) as AgentRunStatus[]
}
