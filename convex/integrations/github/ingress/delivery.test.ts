// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../../_generated/api"
import schema from "../../../schema"
import { prepareGitHubEvent } from "./prepare"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const processDelivery = internal.integrations.github.ingress.delivery.process

test.each([
  "deleted",
  "suspend",
])("expires a %s installation and discards cached access", async (action) => {
  const t = convexTest(schema, modules)
  const integrationId = await seed(t)
  await t.action(processDelivery, {
    integrationId,
    connectionGeneration: 0,
    payload: prepareGitHubEvent({
      event: "installation",
      deliveryId: "delivery",
      payload: {
        action,
        installation: { id: 123, suspended_at: "2026-09-09T10:00:00Z" },
      },
    }),
  })
  expect(
    await t.run(async (ctx) => await ctx.db.get(integrationId))
  ).toMatchObject({ status: "expired", credentials: { installationId: "123" } })
})

test("cannot revoke another installation through the queue consumer", async () => {
  const t = convexTest(schema, modules)
  const integrationId = await seed(t)
  await t.action(processDelivery, {
    integrationId,
    connectionGeneration: 0,
    payload: prepareGitHubEvent({
      event: "installation",
      deliveryId: "delivery",
      payload: { action: "deleted", installation: { id: 456 } },
    }),
  })
  expect(
    await t.run(async (ctx) => await ctx.db.get(integrationId))
  ).toMatchObject({
    status: "active",
    credentials: { tokens: { access: "cached" } },
  })
})

test("a late suspension does not expire an installation reconnected afterward", async () => {
  const t = convexTest(schema, modules)
  const integrationId = await seed(t, Date.parse("2026-09-09T11:00:00Z"))
  await t.action(processDelivery, {
    integrationId,
    connectionGeneration: 0,
    payload: prepareGitHubEvent({
      event: "installation",
      deliveryId: "delivery",
      payload: {
        action: "suspend",
        installation: { id: 123, suspended_at: "2026-09-09T10:00:00Z" },
      },
    }),
  })
  expect(
    await t.run(async (ctx) => await ctx.db.get(integrationId))
  ).toMatchObject({
    status: "active",
    credentials: { tokens: { access: "cached" } },
  })
})

test("the final revocation mutation rejects an earlier connection grant", async () => {
  const t = convexTest(schema, modules)
  const integrationId = await seed(t)
  await t.run(
    async (ctx) =>
      await ctx.db.patch(integrationId, { connectionGeneration: 1 })
  )
  await t.mutation(internal.integrations.github.ingress.delivery.revoke, {
    integrationId,
    installationId: "123",
    expectedConnectionGeneration: 0,
  })
  expect(
    await t.run(async (ctx) => await ctx.db.get(integrationId))
  ).toMatchObject({ status: "active" })
})

async function seed(t: ReturnType<typeof convexTest>, installedAt = 0) {
  return await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "eu",
      createdAt: 0,
      updatedAt: 0,
    })
    return await ctx.db.insert("integrations", {
      createdBy,
      organizationId: "eu",
      integration: "github",
      externalId: "123",
      scope: "organization",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
      data: { installedAt },
      credentials: { installationId: "123", tokens: { access: "cached" } },
    })
  })
}
