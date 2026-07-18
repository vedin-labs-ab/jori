import Exa from "exa-js"
import { requireEnvironmentVariable } from "../shared/environment"

export function createExaClient() {
  return new Exa(requireEnvironmentVariable("EXA_API_KEY"))
}
