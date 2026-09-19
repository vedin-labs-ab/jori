import { storage } from "../../../contracts/billing"
import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../../shared/environment"

const productVariable = "POLAR_PRODUCT_STORAGE"
export function storageProductId() {
  return requireEnvironmentVariable(productVariable)
}
export function storageConfigured() {
  return readEnvironmentVariable(productVariable) !== undefined
}
export function sellsStorage(productId: unknown) {
  return (
    typeof productId === "string" &&
    readEnvironmentVariable(productVariable) === productId
  )
}
export function validExtraGb(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= storage.minimumExtraGb &&
    value <= storage.maximumExtraGb
  )
}
export function requireExtraGb(value: number) {
  if (!validExtraGb(value)) {
    throw new Error(
      `Choose ${storage.minimumExtraGb} to ${storage.maximumExtraGb.toLocaleString("en-US")} extra GB in whole gigabytes.`
    )
  }
}
