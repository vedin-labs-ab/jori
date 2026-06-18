export function base64Decode(value: string) {
  const normalized = value.replace(/\s/g, "")
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value)
  const base64 = base64EncodeBytes(bytes)

  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export function base64Encode(value: string) {
  return base64EncodeBytes(new TextEncoder().encode(value))
}

export function base64EncodeBytes(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize))
  }

  return btoa(binary)
}
