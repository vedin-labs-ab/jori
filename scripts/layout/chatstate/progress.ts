import { getFunctionName } from "convex/server"
import { useEffect } from "react"
import { type useDemoWorkspace } from "@/landing/demo/workspace"
import { makeOffer } from "@/shared/console/runs/fixtures"
import { api } from "../../../convex/_generated/api"
import { delay, type localService } from "./service"

export function useProgress(
  state: string,
  service: ReturnType<typeof localService>,
  workspace: ReturnType<typeof useDemoWorkspace>["state"],
  phase: number
) {
  useEffect(() => {
    if (!state.startsWith("progress")) {
      return
    }
    const summaryName = getFunctionName(api.runs.console.live.get)
    const activityName = getFunctionName(api.runs.activity.index.list)
    const original = workspace.runs.find((run) => run.id === "runs_tip")
    if (!original) {
      throw new Error("Missing seeded approval run")
    }
    const approvals = original.approvals.map((approval) => ({
      ...approval,
      state: "pending" as const,
      decidedAt: undefined,
      expiresAt: workspace.now + 1_800_000,
    }))
    const summary = {
      ...original,
      status: "running",
      approvals: phase >= 2 ? approvals : [],
      offers:
        phase >= 3
          ? [
              makeOffer({
                expiresAt: workspace.now + 1_800_000,
                updatedAt: workspace.now,
              }),
            ]
          : [],
    }
    service.publish(summaryName, phase ? summary : undefined)
    service.publish(
      activityName,
      phase ? workspace.activity[original.id] : undefined
    )
    let attempts = 0
    service.controls.decide = async (args) => {
      await delay()
      attempts += 1
      if (state === "progress-reject" && attempts === 1) {
        throw new Error("Layout fixture rejected the approval update.")
      }
      service.publish(summaryName, {
        ...summary,
        approvals: approvals.map((approval) => ({
          ...approval,
          state: args.decision === "denied" ? "denied" : "approved",
          decidedAt: Date.now(),
        })),
      })
      return {}
    }
  }, [phase, service, state, workspace])
}
