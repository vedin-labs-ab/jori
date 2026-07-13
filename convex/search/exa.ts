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
