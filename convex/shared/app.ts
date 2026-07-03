const appUrlEnv = "MILO_APP_URL"

export type RuntimeEnvironment = Record<string, string | undefined>

export function readAppOrigin(environment: RuntimeEnvironment = process.env) {
  const value = environment[appUrlEnv]?.trim()

  if (value === undefined || value === "") {
    return undefined
  }

  let url: URL

  try {
    url = new URL(value.replace(/\/+$/, ""))
  } catch {
    throw new Error(appUrlError(value))
  }

  if (
    url.origin !== value.replace(/\/+$/, "") ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new Error(appUrlError(value))
  }

  return url.origin
}

export function requireAppOrigin() {
  const origin = readAppOrigin()

  if (origin === undefined) {
    throw new Error(`${appUrlEnv} must be configured.`)
  }

  return origin
}

export function requireAppReturnUrl(returnUrl: string) {
  let url: URL

  try {
    url = new URL(returnUrl)
  } catch {
    throw new Error("Return URL must be absolute.")
  }

  if (url.origin !== requireAppOrigin()) {
    throw new Error("Return URL must point to the Milo app.")
  }

  return url.toString()
}

function appUrlError(value: string) {
  return `${appUrlEnv} must be an http(s) origin, received ${JSON.stringify(value)}.`
}
