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

/** The env file an environment reads.
 *
 *  Development keeps the conventional name. The Convex CLI writes the selected
 *  deployment into `.env.local` and Vite loads it without being asked, so
 *  renaming it would mean fighting two tools for a filename that already means
 *  "this machine". Everything else is named for its environment, because
 *  nothing but development should ever be picked up by accident. */
const files: Record<Environment, string> = {
  dev: ".env.local",
  prod: ".env.prod.local",
}

export function environmentFile(
  environment: Environment,
  region?: "eu" | "us"
) {
  if (region !== undefined) {
    return `.env.${environment}.${region}.local`
  }
  return files[environment]
}

/** The Vercel CLI authenticates locally, but regional files select projects
 * explicitly. A shared .vercel link never decides a production target. */
export const localNames: Record<Environment, readonly string[]> = {
  dev: ["CONVEX_DEPLOYMENT"],
  prod: ["CONVEX_DEPLOY_KEY"],
}

/** Variables the Convex deployment itself must hold before it can serve a
 *  request, verified against the deployment before every production deploy.
 *
 *  This is the set the public product needs: marketing, sign-in, the
 *  waitlist, and agent runs. Sign-in requires both social providers because
 *  `createAuth` resolves every credential on each auth request, so a missing
 *  Microsoft secret breaks Google sign-in too. Runs execute inside the
 *  deployment, so they need the model key to deduce and the E2B key and
 *  template name to open a sandbox. Features add their names here as they
 *  come online. */
export const deploymentNames = [
  "BETTER_AUTH_SECRET",
  "BIRD_API_KEY",
  "BIRD_WORKSPACE_ID",
  "E2B_API_KEY",
  "EXA_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "JORI_APP_URL",
  "JORI_E2B_TEMPLATE",
  "JORI_REGION",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "OPENROUTER_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_MONTH",
  "STRIPE_PRICE_STARTER_YEAR",
  "STRIPE_PRICE_TEAM_MONTH",
  "STRIPE_PRICE_TEAM_YEAR",
] as const
