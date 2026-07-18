export function readEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()
  return value === "" ? undefined : value
}

export function requireEnvironmentVariable(name: string) {
  const value = readEnvironmentVariable(name)

  if (value === undefined) {
    throw new Error(`Missing ${name}`)
  }

  return value
}
