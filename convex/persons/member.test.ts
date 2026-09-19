// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { registerAuth, seedMember } from "../../test/members"
import { authComponent, createAdapterOptions } from "../auth"
import schema from "../schema"
import { createIntegrationActor } from "../shared/actor"
import { findMember, loadAuthUserIds } from "./member"
import { resolveActor } from "./resolve"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const organizationId = "org"

function setup() {
  const t = convexTest(schema, modules)
  registerAuth(t)
  return t
}

function slackActor(fields: { email?: string; external?: boolean }) {
  return createIntegrationActor({ externalId: "U1", name: "Writer", ...fields })
}

test("a workspace insider whose verified email is a member's is that member", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    const member = await seedMember(ctx, {
      organizationId,
      email: "anna@example.com",
    })

    expect(
      await findMember(ctx, {
        organizationId,
        provider: "slack",
        actor: slackActor({ email: "Anna@example.com" }),
      })
    ).toBe(member.personId)
  })
})

test("a stranger is an outsider, and looking them up writes nothing", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    await seedMember(ctx, { organizationId, email: "anna@example.com" })
    const before = await ctx.db.query("persons").take(10)

    expect(
      await findMember(ctx, {
        organizationId,
        provider: "github",
        actor: createIntegrationActor({
          externalId: "583231",
          name: "octocat",
        }),
      })
    ).toBeUndefined()
    expect(await ctx.db.query("persons").take(10)).toEqual(before)
  })
})

test("a Slack Connect partner claiming a member's email stays an outsider", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    const member = await seedMember(ctx, {
      organizationId,
      email: "anna@example.com",
    })
    const partner = slackActor({ email: "anna@example.com", external: true })

    expect(
      await findMember(ctx, {
        organizationId,
        provider: "slack",
        actor: partner,
      })
    ).toBeUndefined()
    // Recording them elsewhere must not merge them into the member either.
    expect(
      await resolveActor(ctx, {
        organizationId,
        provider: "slack",
        actor: partner,
      })
    ).not.toBe(member.personId)
  })
})

test("a person known to Jori without a member row is an outsider", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    const actor = slackActor({ email: "contractor@example.com" })

    await resolveActor(ctx, { organizationId, provider: "slack", actor })

    expect(
      await findMember(ctx, { organizationId, provider: "slack", actor })
    ).toBeUndefined()
  })
})

test("leaving the organization ends a linked writer's standing", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    const member = await seedMember(ctx, {
      organizationId,
      email: "anna@example.com",
    })
    const actor = slackActor({ email: "anna@example.com" })

    await resolveActor(ctx, { organizationId, provider: "slack", actor })
    await authComponent
      .adapter(ctx)(createAdapterOptions())
      .delete({
        model: "member",
        where: [{ field: "userId", value: member.userId }],
      })

    expect(
      await findMember(ctx, { organizationId, provider: "slack", actor })
    ).toBeUndefined()
  })
})

test("membership in another organization does not carry over", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    await seedMember(ctx, {
      organizationId: "elsewhere",
      email: "anna@example.com",
    })

    expect(
      await findMember(ctx, {
        organizationId,
        provider: "slack",
        actor: slackActor({ email: "anna@example.com" }),
      })
    ).toBeUndefined()
  })
})

test("resolves a person to their auth user ids in this organization", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    const member = await seedMember(ctx, {
      organizationId,
      email: "anna@example.com",
    })

    await resolveActor(ctx, {
      organizationId,
      provider: "slack",
      actor: slackActor({ email: "anna@example.com" }),
    })

    expect(
      await loadAuthUserIds(ctx, { organizationId, personId: member.personId })
    ).toEqual([member.userId])
    expect(
      await loadAuthUserIds(ctx, {
        organizationId: "elsewhere",
        personId: member.personId,
      })
    ).toEqual([])
  })
})
