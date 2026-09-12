import { cancel, type WorkflowId } from "@convex-dev/workflow"
import { components } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { stopRun } from "../../runs/tree"

export async function quiesce(
  ctx: MutationCtx,
  row: Doc<"workspaceRetention">
) {
  const table = ["integrations", "jobs", "runs"] as const
  const selected = table[row.stage ?? 0]
  if (!selected) {
    return true
  }
  const page = await ctx.db
    .query(selected)
    .paginate({ cursor: row.cursor ?? null, numItems: 10 })
  for (const item of page.page) {
    if (item.organizationId !== row.organizationId) {
      continue
    }
    await stopItem(ctx, selected, item)
  }
  await ctx.db.patch(row._id, {
    stage: page.isDone ? (row.stage ?? 0) + 1 : row.stage,
    cursor: page.isDone ? undefined : page.continueCursor,
  })
  return false
}

export async function workflowsSettled(
  ctx: MutationCtx,
  row: Doc<"workspaceRetention">
) {
  const page = await ctx.db
    .query("runs")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", row.organizationId)
    )
    .paginate({ cursor: row.cursor ?? null, numItems: 10 })
  if (page.page.some((run) => run.workflowId)) {
    return false
  }
  await ctx.db.patch(row._id, {
    cursor: page.isDone ? undefined : page.continueCursor,
    stage: page.isDone ? 5 : 4,
  })
  return page.isDone
}

async function stopItem(
  ctx: MutationCtx,
  selected: "integrations" | "jobs" | "runs",
  item: Doc<"integrations"> | Doc<"jobs"> | Doc<"runs">
) {
  if (selected === "integrations") {
    await ctx.db.patch(item._id, { status: "disconnected" })
  } else if (selected === "jobs" && "trigger" in item) {
    if ("functionId" in item.trigger && item.trigger.functionId) {
      await ctx.scheduler.cancel(item.trigger.functionId)
    }
    await ctx.db.patch(item._id, { status: "paused" })
  } else if (selected === "runs" && "audience" in item) {
    await stopRun(ctx, item)
    if (item.workflowId) {
      await cancel(ctx, components.workflow, item.workflowId as WorkflowId)
    }
  }
}
