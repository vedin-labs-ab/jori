/** Where a task's worktree serves from, beside `main` on 8050. */
export const previewOrigin = "http://localhost:8051"

const override = "PREVIEW_"

/** A preview deployment's region, read from the URL Convex gives it. */
export function previewRegion(url: string) {
  return url.includes(".eu-west-1.") ? "eu" : "us"
}

/** Which dev variable each preview variable takes its value from. A dev
 *  variable named `PREVIEW_<NAME>` stands in for `<NAME>`: previews live in
 *  one region, so a region-bound credential needs its own. */
export function previewSources(names: readonly string[]) {
  const sources = new Map<string, string>()

  for (const name of names) {
    if (!name.startsWith(override)) {
      sources.set(name, sources.get(name) ?? name)
    } else {
      sources.set(name.slice(override.length), name)
    }
  }

  return sources
}

/** Variables a preview sets itself, never copied from dev. */
export function previewSettings(url: string): Record<string, string> {
  return {
    JORI_REGION: previewRegion(url),
    JORI_APP_URL: previewOrigin,
    JORI_PUBLIC_ORIGIN: previewOrigin,
  }
}

/** The worktree's `.env.local`, pointing its app and CLI at the preview. */
export function previewEnvFile(deployment: string, url: string) {
  const region = previewRegion(url)

  return [
    `CONVEX_DEPLOYMENT=preview:${deployment}`,
    `VITE_CONVEX_URL=${url}`,
    `VITE_CONVEX_SITE_URL=${url.replace(/\.cloud$/, ".site")}`,
    `VITE_JORI_REGION=${region}`,
    `VITE_JORI_ENABLED_REGIONS=${region}`,
    `VITE_JORI_PUBLIC_ORIGIN=${previewOrigin}`,
    `VITE_JORI_${region.toUpperCase()}_ORIGIN=${previewOrigin}`,
    "",
  ].join("\n")
}
