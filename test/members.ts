/// <reference types="vite/client" />
import { type convexTest } from "convex-test"
import { type MutationCtx } from "../convex/_generated/server"
import { authComponent, createAdapterOptions } from "../convex/auth"
import authSchema from "../convex/betterauth/schema"
import { ensureAccountPerson } from "../convex/persons/account"

const authModules = import.meta.glob("/convex/betterauth/**/*.{ts,js}")

/** Membership lives in Better Auth, so a test that seeds members mounts it. */
export function registerAuth(t: ReturnType<typeof convexTest>) {
  t.registerComponent("betterAuth", authSchema, authModules)
}

/** A signed-in member of the organization: the Better Auth user and member
 *  row, and the person their verified sign-in email resolves to. */
export async function seedMember(
  ctx: MutationCtx,
  args: { organizationId: string; email: string; name?: string }
) {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const user = await adapter.create<{ id: string }>({
    model: "user",
    data: {
      name: args.name ?? "Member",
      email: args.email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await adapter.create({
    model: "member",
    data: {
      organizationId: args.organizationId,
      userId: user.id,
      role: "member",
      createdAt: new Date(),
    },
  })

  const personId = await ensureAccountPerson(ctx, {
    organizationId: args.organizationId,
    userId: user.id,
    email: args.email,
    name: args.name,
  })

  return { personId, userId: user.id }
}
