import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import { organization } from "better-auth/plugins/organization"
import { components } from "./_generated/api"
import { type DataModel } from "./_generated/dataModel"
import { type Invitation } from "./access/invitation"
import authConfig from "./auth.config"
import authSchema from "./betterauth/schema"
import { requireAppOrigin } from "./shared/app"
import { requireEnvironmentVariable } from "./shared/environment"

/** Sign-in is social-only: both providers report verified work emails, and
 *  trusted linking folds the two into one user per address. */
const trustedProviders = ["google", "microsoft"]

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  { local: { schema: authSchema } }
)

/** The schema-shaping options. The component adapter derives its table
 *  model from exactly this plugin set, so it is shared: runtime adds the
 *  delivery callback, which does not affect schema. */
function createOptions(delivery?: {
  sendInvitationEmail: (invitation: Invitation) => Promise<void>
}) {
  return {
    account: {
      accountLinking: { enabled: true, trustedProviders },
    },
    plugins: [
      organization({ sendInvitationEmail: delivery?.sendInvitationEmail }),
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
      // Dynamic import: the delivery edge references app components
      // (Resend), which must stay out of the component adapter's bundle.
      sendInvitationEmail: async (invitation) => {
        const { sendInvitation } = await import("./access/invitation")

        await sendInvitation(ctx, invitation)
      },
    }),
    baseURL: requireAppOrigin(),
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
    ...(typeof organizationId === "string" ? { org: organizationId } : {}),
  }
}
