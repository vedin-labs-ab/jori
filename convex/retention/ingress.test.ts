import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type Doc } from "../_generated/dataModel"
import { upsertIntegration } from "../integrations/connect/install"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { createPerson } from "../persons/data"
import { writeRunDraft } from "../runs/execution/drafts/data"
import { isRunExecutable } from "../runs/execution/guard"
import { upsertSandbox } from "../runs/execution/sandboxes/data"
import { recordTrace } from "../runs/execution/traces/write"
import { appendTranscript } from "../runs/execution/transcript/data"
import { insertRow } from "../shared/context"

test.each(["deleting", "deleted"])(
  "%s workspaces reject late producers without affecting another workspace",
  async (state) => {
    const { ctx, database, run, runId, values } = await setup(state)
    expect(
      await findActiveIntegrationByExternalId(ctx, {
        integration: "slack",
        externalId: "T-CLOSED",
      })
    ).toBeNull()
    await expect(upsertIntegration(ctx, null, values)).rejects.toThrow(
      "deleted"
    )
    await expect(
      createPerson(ctx, { organizationId: "closed" })
    ).rejects.toThrow("deleted")
    await expect(
      insertRow(ctx, "persons", {
        organizationId: "closed",
        createdAt: 1,
        updatedAt: 1,
      })
    ).rejects.toThrow("deleted")
    expect(await isRunExecutable(ctx, run)).toBe(false)
    await writeRunDraft(ctx, {
      runId,
      reasoning: "private",
      text: "late",
      turn: 1,
    })
    await appendTranscript(ctx, runId, [{ role: "user", content: "late" }])
    expect(
      await recordTrace(ctx, { run, key: "late", type: "run.stopped" })
    ).toBe(false)
    expect(
      await upsertSandbox(ctx, { runId, externalId: "late-sandbox" })
    ).toBe(false)
    for (const table of ["drafts", "transcript", "traces", "sandboxes"]) {
      expect(await database.query(table).collect()).toEqual([])
    }
    expect(await createPerson(ctx, { organizationId: "other" })).toBeTruthy()
  }
)

async function setup(state: string) {
  const { ctx, database } = databaseContext()
  await database.insert("workspaceRetention", {
    organizationId: "closed",
    state,
    endedAt: 1,
    deletesAt: 2,
  })
  const personId = await database.insert("persons", {
    organizationId: "closed",
  })
  const runId = await database.insert("runs", {
    organizationId: "closed",
    status: "running",
  })
  const run = (await ctx.db.get(runId)) as Doc<"runs">
  const values = {
    organizationId: "closed",
    integration: "slack" as const,
    scope: "organization" as const,
    externalId: "T-CLOSED",
    credentials: {},
    status: "active" as const,
    createdBy: personId,
    updatedAt: 1,
  }
  await database.insert("integrations", { ...values, createdAt: 1 })
  return { ctx, database, run, runId, values }
}
