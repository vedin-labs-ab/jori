import { isPublicHostname } from "../../contracts/website"

export function publicUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username !== "" ||
      url.password !== "" ||
      !isPublicHostname(url.hostname)
    ) {
      return null
    }
    url.hash = ""
    return url.href
  } catch {
    return null
  }
}
