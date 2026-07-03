export function base64Decode(value: string) {
  return new TextDecoder().decode(base64DecodeBytes(value.replace(/\s/g, "")))
}

export function base64DecodeBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export function base64UrlDecodeBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/")

  return base64DecodeBytes(
    base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  )
}

export function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value))
}

export function base64UrlEncodeBytes(bytes: Uint8Array) {
  return base64EncodeBytes(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
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
