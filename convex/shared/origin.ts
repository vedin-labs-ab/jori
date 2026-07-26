import { isRegion } from "../../contracts/region"

const regionEnv = "JORI_REGION"
const originEnv = "JORI_APP_URL"

export type RuntimeEnvironment = Record<string, string | undefined>

export function readRegion(environment: RuntimeEnvironment = process.env) {
  const value = environment[regionEnv]?.trim()

  if (value === undefined || value === "") {
    return undefined
  }

  if (!isRegion(value)) {
    throw new Error(`${regionEnv} must be "us" or "eu".`)
  }

  return value
}

export function requireRegion() {
  const region = readRegion()

  if (region === undefined) {
    throw new Error(`${regionEnv} must be configured.`)
  }

  return region
}

export function readOrigin(environment: RuntimeEnvironment = process.env) {
  const value = environment[originEnv]?.trim()

  if (value === undefined || value === "") {
    return undefined
  }

  let url: URL

  try {
    url = new URL(value.replace(/\/+$/, ""))
  } catch {
    throw new Error(originError(value))
  }

  if (
    url.origin !== value.replace(/\/+$/, "") ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new Error(originError(value))
  }

  return url.origin
}

export function requireOrigin() {
  const origin = readOrigin()

  if (origin === undefined) {
    throw new Error(`${originEnv} must be configured.`)
  }

  return origin
}

export function requireReturnUrl(returnUrl: string) {
  let url: URL

  try {
    url = new URL(returnUrl)
  } catch {
    throw new Error("Return URL must be absolute.")
  }

  if (url.origin !== requireOrigin()) {
    throw new Error("Return URL must point to the Jori app.")
  }

  return url.toString()
}

function originError(value: string) {
  return `${originEnv} must be an http(s) origin, received ${JSON.stringify(value)}.`
}
