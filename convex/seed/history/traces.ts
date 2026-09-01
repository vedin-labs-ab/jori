import { joriModel } from "../../../contracts/billing"
import { getToolPermission } from "../../../contracts/permissions"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type SeedContext } from "../context"
import { type SeededRun } from "./runs"
import { type WorkItem } from "./work"

// What a run did, step by step, for the runs recent enough that someone
// would open them. Tool descriptions come from the permission catalog rather
// than being written again here, so a trace names its tools the way the rest
// of the product does.

/** Older runs keep their summary row and lose their timeline, which is what
 *  a retention window would have left behind anyway. */
const tracedRuns = 14

const defaultTools = ["conversations_history", "read_table", "list_table_rows"]

export async function seedTraces(
  ctx: MutationCtx,
  seed: SeedContext,
  seeded: SeededRun[]
) {
  const recent = [...seeded]
    .sort((left, right) => right.run.createdAt - left.run.createdAt)
    .slice(0, tracedRuns)

  for (const { run, item } of recent) {
    await writeTimeline(ctx, seed, run, item)
  }

  return recent.length
}

async function writeTimeline(
  ctx: MutationCtx,
  seed: SeedContext,
  run: Doc<"runs">,
  item: WorkItem
) {
  const tools = runTools(run)
  const write = stepWriter(ctx, seed, run)

  await write({ type: "run.prepared", data: { tools: toolSnapshot(tools) } })
  await write({ type: "run.started", attempt: 1 })
  await write({ type: "model.started", attempt: 1 })

  for (const [index, tool] of tools.entries()) {
    await write({ type: "tool.started", attempt: 1, callId: `call_${index}` })
    await write({
      type: "tool.completed",
      attempt: 1,
      callId: `call_${index}`,
      data: {
        tool: toolRef(tool),
        result: { kind: "array", size: 3 + index },
        provider: null,
      },
    })
  }

  await write({
    type: "model.completed",
    attempt: 1,
    data: modelData(item),
  })
  await write(terminalStep(item))
}

/** Preparation and stopping sit outside the worker's timeline, so they carry
 *  no sequence; everything else is a numbered step. */
const untimed = new Set(["run.prepared", "run.stopped"])

/** Each step is stamped with the next timestamp and sequence, so a timeline
 *  reads in order without every call site doing the arithmetic. */
function stepWriter(ctx: MutationCtx, seed: SeedContext, run: Doc<"runs">) {
  let step = 0

  return async (trace: { type: string } & Record<string, unknown>) => {
    step += 1

    await ctx.db.insert("traces", {
      organizationId: seed.organizationId,
      runId: run._id,
      key: `${run._id}:${step}`,
      timestamp: run.createdAt + step * 900,
      ...(untimed.has(trace.type) ? {} : { sequence: step }),
      ...trace,
    } as never)
  }
}

function terminalStep(item: WorkItem) {
  return item.status === "failed"
    ? {
        type: "run.failed",
        attempt: 1,
        data: { error: item.error ?? "The run failed." },
      }
    : {
        type: "run.completed",
        attempt: 1,
        data: { result: item.title },
      }
}

function modelData(item: WorkItem) {
  const cacheRead = Math.round(item.tokens.input * 0.62)
  const uncached = item.tokens.input - cacheRead

  return {
    model: joriModel,
    usage: {
      durationMs: item.durationMs,
      tokens: {
        cacheRead,
        cacheWrite: Math.round(uncached * 0.3),
        input: item.tokens.input,
        output: item.tokens.output,
        reasoning: Math.round(item.tokens.output * 0.4),
        total: item.tokens.input + item.tokens.output,
        uncached,
      },
      toolCalls: 2,
    },
    output: item.status === "failed" ? null : item.title,
    reasoning: null,
  }
}

/** The tools this run was actually granted, or a plain read set for the
 *  interactive work that carries no access snapshot. */
function runTools(run: Doc<"runs">) {
  const granted = run.access?.integrations.flatMap(
    (integration) => integration.tools
  )

  return (
    granted === undefined || granted.length === 0 ? defaultTools : granted
  ).slice(0, 3)
}

function toolRef(tool: string) {
  const permission = getToolPermission(tool)

  return {
    name: tool,
    route: "surface" as const,
    access: permission?.access ?? ("read" as const),
  }
}

/** The contract a run was prepared with, described the way the catalog
 *  describes it. */
function toolSnapshot(tools: string[]) {
  const permissions = tools.flatMap((tool) => {
    const permission = getToolPermission(tool)

    return permission === undefined ? [] : [permission]
  })

  return {
    groups: [
      {
        surface: permissions[0]?.surface ?? ("jori" as const),
        label: "Granted for this run",
        tools: permissions.map((permission) => ({
          access: permission.access,
          description: permission.description,
          label: permission.label,
          tool: permission.tool,
        })),
      },
    ],
    webSearch: false,
  }
}
