/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { type ActionCtx } from "../convex/_generated/server"
import schema from "../convex/schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

export async function approvalFixture() {
  const t = convexTest(schema, modules)
  const seeded = await t.run(async (ctx) => {
    const runId = await ctx.db.insert("runs", approvalRunFields())
    const personId = await ctx.db.insert("persons", {
      organizationId: "verification",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const approvalId = await ctx.db.insert("approvals", {
      organizationId: "verification",
      runId,
      surface: "jori",
      tool: "read_file",
      args: JSON.stringify({ fileId: "synthetic-file" }),
      summary: "Read synthetic fixture",
      code: "ABC12345",
      status: "approved",
      requestedBy: { kind: "person", personId },
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    })
    return { args: { runId, approvalId }, personId }
  })
  const ctx = {
    runMutation: t.mutation,
    runQuery: t.query,
  } as unknown as ActionCtx
  return { t, ctx, ...seeded }
}

export function approvalRunFields() {
  return {
    organizationId: "verification",
    audience: "organization" as const,
    principal: { kind: "organization" as const },
    cause: { type: "manual" as const },
    instructions: "Verify the synthetic approval fixture only.",
    snapshot: {
      title: "Approval regression",
      source: { type: "manual" as const },
      context: [],
    },
    status: "running" as const,
    createdAt: Date.now(),
  }
}
