/**
 * Who else touches the data, and for what.
 *
 * Real marks, from each vendor's own assets: Convex, Resend, OpenRouter, and
 * PostHog publish an SVG; Trigger.dev and E2B publish only raster, so those
 * are their official PNGs. Each one is fitted into the same square box rather
 * than cropped or stretched to fill it — PostHog's hedgehog is wider than it
 * is tall, and a mark redrawn to match its neighbours is no longer the mark.
 */
const subprocessors = [
  {
    logo: "/logos/subprocessors/convex.svg",
    name: "Convex",
    url: "https://convex.dev",
    purpose: "Stores the data, including sign-in sessions.",
  },
  {
    logo: "/logos/subprocessors/trigger.png",
    name: "Trigger.dev",
    url: "https://trigger.dev",
    purpose: "Executes runs.",
  },
  {
    logo: "/logos/subprocessors/e2b.png",
    name: "E2B",
    url: "https://e2b.dev",
    purpose: "Runs sandboxed work.",
  },
  {
    logo: "/logos/subprocessors/resend.svg",
    name: "Resend",
    url: "https://resend.com",
    purpose: "Delivers Jori's email.",
  },
  {
    logo: "/logos/subprocessors/openrouter.svg",
    name: "OpenRouter",
    url: "https://openrouter.ai",
    purpose: "Routes model calls to the provider.",
  },
  {
    logo: "/logos/subprocessors/posthog.svg",
    name: "PostHog",
    url: "https://posthog.com",
    purpose: "Counts how the website is used.",
  },
] as const

export function Subprocessors() {
  return (
    <ul className="mt-0.5 grid gap-2.5">
      {subprocessors.map(({ logo, name, purpose, url }) => (
        // Each row is one line, so the mark centres against it rather than
        // hanging from a hand-tuned offset that only holds at one text size.
        <li className="flex items-center gap-2.5" key={name}>
          <img alt="" className="size-4 shrink-0 object-contain" src={logo} />
          <p>
            <a
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
              href={url}
              rel="noreferrer"
              target="_blank"
            >
              {name}
            </a>{" "}
            {purpose}
          </p>
        </li>
      ))}
    </ul>
  )
}
