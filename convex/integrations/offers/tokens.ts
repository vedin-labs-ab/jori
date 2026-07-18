import { sha256Hex } from "../../shared/crypto"
import { base64UrlEncodeBytes } from "../../shared/encoding"

export function createIntegrationOfferToken() {
  const bytes = new Uint8Array(32)

  crypto.getRandomValues(bytes)

  return base64UrlEncodeBytes(bytes)
}

export async function hashIntegrationOfferToken(token: string) {
  return await sha256Hex(token)
}
