import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { organization } from "better-auth/plugins/organization"
import { components, internal } from "./_generated/api"
import { type DataModel } from "./_generated/dataModel"
import { type Invitation } from "./access/invitation"
import authConfig from "./auth.config"
import authSchema from "./betterauth/schema"
import { requireEnvironmentVariable } from "./shared/environment"
import { requireOrigin, requireRegion } from "./shared/origin"

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  { local: { schema: authSchema } }
)

/** The schema-shaping options. The component adapter derives its table
 *  model from exactly this plugin set, so it is shared: runtime adds the
 *  callbacks, which do not affect schema. */
function createOptions(runtime?: {
  sendInvitationEmail: (invitation: Invitation) => Promise<void>
  allowUserToCreateOrganization: (user: { email: string }) => Promise<boolean>
}) {
  return {
    account: {
      accountLinking: {
        enabled: false,
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: runtime?.allowUserToCreateOrganization,
        sendInvitationEmail: runtime?.sendInvitationEmail,
        // Teams are deliberate groupings, soon access-control grantees, so
        // none exist until someone creates one: no auto default team, and an
        // organization may go back to zero.
        teams: {
          allowRemovingAllTeams: true,
          defaultTeam: { enabled: false },
          enabled: true,
        },
      }),
      convex({ authConfig, jwt: { definePayload } }),
    ],
  }
}

/** Env-free options for the component adapter in convex/betterauth, which
 *  evaluates at module scope where deployment env is unavailable. */
export const createAdapterOptions = () => createOptions()

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    ...createOptions({
      // Jori is closed, and this is where that is true rather than merely
      // displayed: Better Auth refuses the creation, so a signed-in stranger
      // never gets the organization claim every other surface demands.
      allowUserToCreateOrganization: async (user) =>
        await ctx.runQuery(internal.access.allowlist.check, {
          email: user.email,
        }),
      // App delivery functions stay out of the component adapter's bundle.
      sendInvitationEmail: async (invitation) => {
        const { sendInvitation } = await import("./access/invitation")

        await sendInvitation(ctx, invitation)
      },
    }),
    baseURL: requireOrigin(),
    secret: requireEnvironmentVariable("BETTER_AUTH_SECRET"),
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: socialCredentials("GOOGLE"),
      microsoft: socialCredentials("MICROSOFT"),
    },
  })

/** Serves a Better Auth request. Reached through a dynamic import so the
 *  Better Auth module graph stays out of http.ts module evaluation, which
 *  has a hard memory ceiling at push time. */
export async function handleAuthRequest(
  ctx: GenericCtx<DataModel>,
  request: Request
) {
  return await createAuth(ctx).handler(restoreForwardedHeaders(request))
}

/** The app-side auth proxy stashes the original host under x-better-auth-*
 *  headers; Better Auth expects them back as standard forwarded headers. */
function restoreForwardedHeaders(request: Request) {
  const host = request.headers.get("x-better-auth-forwarded-host")
  const protocol = request.headers.get("x-better-auth-forwarded-proto")

  if (host === null && protocol === null) {
    return request
  }

  const headers = new Headers(request.headers)

  if (host !== null) {
    headers.set("x-forwarded-host", host)
  }

  if (protocol !== null) {
    headers.set("x-forwarded-proto", protocol)
  }

  return new Request(request, { headers })
}

function socialCredentials(provider: "GOOGLE" | "MICROSOFT") {
  return {
    clientId: requireEnvironmentVariable(`${provider}_CLIENT_ID`),
    clientSecret: requireEnvironmentVariable(`${provider}_CLIENT_SECRET`),
  }
}

/** Claims for the Convex JWT. The `org` claim carries the session's active
 *  organization so organization access checks stay a pure token comparison. */
function definePayload({
  user,
  session,
}: {
  user: { email: string; name: string }
  session: Record<string, unknown>
}) {
  const organizationId = session.activeOrganizationId

  return {
    email: user.email,
    name: user.name,
    region: requireRegion(),
    ...(typeof session.id === "string" ? { sid: session.id } : {}),
    ...(typeof organizationId === "string" ? { org: organizationId } : {}),
  }
}
