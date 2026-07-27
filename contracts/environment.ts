/** The environments Jori deploys to.
 *
 *  Staging slots in here without touching anything else: add the name, add its
 *  env file, and provision resources under the matching `jori-staging` names.
 *  Nothing here is dev-or-prod specific by construction. */
export const environments = ["dev", "prod"] as const

export type Environment = (typeof environments)[number]

export function isEnvironment(value: unknown): value is Environment {
  return environments.some((environment) => environment === value)
}
