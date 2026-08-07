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

export function environmentFile(environment: Environment) {
  return files[environment]
}

/** Local variables the wrapper refuses to run without.
 *
 *  Production is one deploy key plus the Trigger.dev project ref. The Vercel
 *  CLI carries its own credentials and reads the linked project from
 *  `.vercel/`, and the Trigger.dev CLI authenticates from `npx trigger login`
 *  (or `TRIGGER_ACCESS_TOKEN` where no login session exists), so hosting
 *  credentials are not restated here. */
export const localNames: Record<Environment, readonly string[]> = {
  dev: ["CONVEX_DEPLOYMENT"],
  prod: ["CONVEX_DEPLOY_KEY", "TRIGGER_PROJECT_REF"],
}

/** Variables the Convex deployment itself must hold before it can serve a
 *  request, verified against the deployment before every production deploy.
 *
 *  This is the set the public product needs: marketing, sign-in, the
 *  waitlist, and agent runs. Sign-in requires both social providers because
 *  `createAuth` resolves every credential on each auth request, so a missing
 *  Microsoft secret breaks Google sign-in too. Runs need the Trigger.dev
 *  secret key to dispatch, the worker secret to authenticate workers, and
 *  the model key to deduce. Features add their names here as they come
 *  online. */
export const deploymentNames = [
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "JORI_APP_URL",
  "JORI_REGION",
  "JORI_WORKER_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "OPENROUTER_API_KEY",
  "RESEND_API_KEY",
  "TRIGGER_DEV_API_KEY",
] as const

/** Variables the deployed Trigger.dev workers need at run time, verified by
 *  name against the target Trigger.dev environment before every production
 *  deploy. Values live in the Trigger.dev dashboard; the check reads only
 *  names. Development is exempt: there the worker is the local CLI, which
 *  reads these from `.env.local` directly. */
export const workerNames = [
  "CONVEX_SITE_URL",
  "CONVEX_URL",
  "E2B_API_KEY",
  "JORI_E2B_TEMPLATE",
  "JORI_WORKER_SECRET",
  "OPENROUTER_API_KEY",
] as const
