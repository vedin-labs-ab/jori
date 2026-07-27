/** The environments Jori deploys to.
 *
 *  Staging slots in here without touching anything else: add the name, add
 *  its env file, and provision resources under the matching `jori-staging`
 *  names. Nothing below is dev-or-prod specific by construction. */
export const environments = ["dev", "prod"] as const

export type Environment = (typeof environments)[number]

export function isEnvironment(value: string): value is Environment {
  return environments.includes(value as Environment)
}

/** The env file an environment reads. Dev holds working credentials. Prod
 *  holds credentials that *target* production, never the secrets production
 *  *runs on* — those live in the Convex and Vercel dashboards so a developer
 *  machine never has to. */
export function environmentFile(environment: Environment) {
  return `.env.${environment}.local`
}

/** Local variables the wrapper refuses to run without. */
export const localNames: Record<Environment, readonly string[]> = {
  dev: ["CONVEX_DEPLOYMENT"],
  prod: [
    "CONVEX_DEPLOY_KEY",
    "VERCEL_ORG_ID",
    "VERCEL_PROJECT_ID",
    "VERCEL_TOKEN",
  ],
}

/** Variables the Convex deployment itself must hold before it can serve a
 *  request, verified against the deployment before every production deploy.
 *
 *  This is the set the public product needs: marketing, sign-in, and the
 *  waitlist. Sign-in requires both social providers because `createAuth`
 *  resolves every credential on each auth request, so a missing Microsoft
 *  secret breaks Google sign-in too. Features add their names here as they
 *  come online. */
export const deploymentNames = [
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "JORI_APP_URL",
  "JORI_EMAIL_FROM",
  "JORI_REGION",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "RESEND_API_KEY",
] as const
