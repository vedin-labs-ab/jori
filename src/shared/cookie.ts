/** One cookie's value out of a `Cookie` header or `document.cookie`. */
export function readCookie(cookies: string | null, name: string) {
  for (const part of (cookies ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=")

    if (key === name) {
      return rest.join("=")
    }
  }

  return undefined
}

/** The attributes that make a cookie the site's: shared across the public
 *  origin and its regional hosts, over https where the site is served so. */
export function siteCookieAttributes(
  publicOrigin: string,
  maxAgeSeconds: number
) {
  const url = new URL(publicOrigin)
  const domain = url.hostname.includes(".") ? `; Domain=${url.hostname}` : ""
  const secure = url.protocol === "https:" ? "; Secure" : ""

  return `Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${domain}${secure}`
}
