import Exa from "exa-js"

export function createExaClient() {
  return new Exa(requireExaApiKey())
}

function requireExaApiKey() {
  const apiKey = process.env.EXA_API_KEY?.trim()

  if (apiKey === undefined || apiKey === "") {
    throw new Error("Missing EXA_API_KEY")
  }

  return apiKey
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
  }
}
