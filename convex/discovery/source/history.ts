import { type Doc } from "../../_generated/dataModel"
import { conversationGate } from "../../conversations/access"
import { findMessageConversation } from "../../conversations/resolve"
import { jobGate } from "../../jobs/access"
import { projectTraceActivity } from "../../runs/activity/traces"
import { runResourceGate } from "../../runs/sight"
import { canSeeRun } from "../../runs/visibility"
import { type QueryLikeCtx } from "../../shared/context"
import { type Sight } from "../../visibility/sight"
import { type Source } from "./types"
export async function history(
  ctx: QueryLikeCtx,
  table: string,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  switch (table) {
    case "conversations":
    case "messages":
      return chat(ctx, table, id, sight)
    case "jobs":
      return job(ctx, id, sight)
    case "runs":
    case "traces":
      return run(ctx, table, id, sight)
    default:
      return null
  }
}

async function chat(
  ctx: QueryLikeCtx,
  table: string,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  const mid = table === "messages" ? ctx.db.normalizeId("messages", id) : null
  const message = mid ? await ctx.db.get(mid) : null
  if (table === "messages" && message?.surface !== "console") {
    return null
  }
  const cid =
    table === "conversations" ? ctx.db.normalizeId("conversations", id) : null
  const row = message
    ? await findMessageConversation(ctx, message)
    : cid
      ? await ctx.db.get(cid)
      : null
  if (row?.surface !== "console" || !row.visibility) {
    return null
  }
  const gate = conversationGate(row)
  if (sight && !(await sight.canSee(gate))) {
    return null
  }
  const key = `conversations:${row._id}`
  return {
    organizationId: row.organizationId,
    sourceKey: `${table}:${id}`,
    resourceKey: key,
    authorityKey: key,
    resourceId: row._id,
    kind: "chat",
    title: row.title || "Untitled chat",
    resourceName: row.title || "Untitled chat",
    gate,
    updatedAt: message?.createdAt ?? row.updatedAt ?? row._creationTime,
    sections: chatSections(row, message),
  }
}

function chatSections(
  row: Doc<"conversations">,
  message: Doc<"messages"> | null
): Source["sections"] {
  return message
    ? [
        {
          text: message.text ?? "",
          location: { kind: "message", id: message._id, field: "text" },
        },
      ]
    : [
        {
          text: row.title ?? "",
          location: { kind: "resource", id: row._id, field: "title" },
        },
        {
          text: row.summary ?? "",
          location: { kind: "resource", id: row._id, field: "summary" },
        },
      ]
}

async function job(
  ctx: QueryLikeCtx,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  const key = ctx.db.normalizeId("jobs", id)
  const row = key ? await ctx.db.get(key) : null
  if (!row || (sight && !(await sight.canSee(jobGate(row))))) {
    return null
  }
  return {
    organizationId: row.organizationId,
    sourceKey: `jobs:${id}`,
    resourceKey: `jobs:${id}`,
    authorityKey: `jobs:${id}`,
    resourceId: id,
    kind: "job",
    title: row.name,
    resourceName: row.name,
    updatedAt: row.updatedAt,
    gate: jobGate(row),
    sections: [
      { text: row.name, location: { kind: "resource", id, field: "name" } },
      {
        text: row.instructions,
        location: { kind: "resource", id, field: "instructions" },
      },
    ],
  }
}

async function run(
  ctx: QueryLikeCtx,
  table: string,
  id: string,
  sight?: Sight
): Promise<Source | null> {
  const tid = table === "traces" ? ctx.db.normalizeId("traces", id) : null
  const trace = tid ? await ctx.db.get(tid) : null
  const rid = table === "runs" ? ctx.db.normalizeId("runs", id) : trace?.runId
  const row = rid ? await ctx.db.get(rid) : null
  if (
    !row ||
    (table === "traces" && !trace) ||
    (sight &&
      (row.organizationId !== sight.organizationId ||
        !(await canSeeRun(ctx, row, sight.personId, sight))))
  ) {
    return null
  }
  const resourceGate = await runResourceGate(ctx, row)
  if (resourceGate === null) {
    return null
  }
  const gate = resourceGate ?? {
    organizationId: row.organizationId,
    visibility:
      row.audience === "organization" || !row.createdBy
        ? { mode: "organization" as const }
        : { mode: "private" as const },
    ownerId: row.createdBy,
  }
  return runSource(ctx, row, trace, table, id, gate)
}

async function runSource(
  ctx: QueryLikeCtx,
  row: Doc<"runs">,
  trace: Doc<"traces"> | null,
  table: string,
  id: string,
  gate: Source["gate"]
): Promise<Source | null> {
  const text = trace
    ? activityText(row, trace)
    : [row.snapshot.title, row.status, row.result, row.error]
        .filter(Boolean)
        .join("\n")
  if (!text) {
    return null
  }
  const authorityKey = await runAuthority(ctx, row)
  return {
    organizationId: row.organizationId,
    sourceKey: `${table}:${id}`,
    resourceKey: `runs:${row._id}`,
    authorityKey,
    resourceId: row._id,
    kind: "run",
    title: row.snapshot.title,
    resourceName: row.snapshot.title,
    gate,
    updatedAt: trace?.timestamp ?? row.endedAt ?? row.createdAt,
    sections: [
      {
        text,
        location: trace
          ? { kind: "activity", id: trace._id, label: "Run activity" }
          : { kind: "resource", id: row._id },
      },
    ],
  }
}

async function runAuthority(ctx: QueryLikeCtx, row: Doc<"runs">) {
  // Dependent runs are refreshed when their authority's sharing changes.
  const rootId = row.rootId ?? row.parentId
  const root =
    !row.conversationId && !row.job && rootId ? await ctx.db.get(rootId) : null
  const authority = root?.organizationId === row.organizationId ? root : row
  const authorityKey = authority.conversationId
    ? `conversations:${authority.conversationId}`
    : authority.job
      ? `jobs:${authority.job.id}`
      : `runs:${authority._id}`

  return authorityKey
}

function activityText(run: Doc<"runs">, trace: Doc<"traces">) {
  return projectTraceActivity({
    run,
    traces: [trace],
    approvals: [],
    files: [],
    agents: [],
    offers: [],
    collections: [],
    waiters: [],
  })
    .map((item) =>
      [
        item.title,
        item.description,
        ...(item.details ?? []).map((d) => `${d.label}: ${d.value}`),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n")
}
