import { LogoImage } from "@/shared/logo/image"

/**
 * Who else touches the data, and for what.
 *
 * Marks come from the vendors' official assets, fitted without cropping.
 * A mark drawn in one dark ink is flagged so it flips on a dark ground;
 * PostHog's holds its colors around a black hog, so it swaps to the
 * white-hog file there instead.
 * The same providers the DPA's table lists, purposes only; the region per
 * provider lives there.
 */
type Subprocessor = {
  /** The file for a dark ground, when the mark keeps colors around a black ink. */
  dark?: string
  /** Drawn in one dark ink, so it flips on a dark ground. */
  ink?: boolean
  logo: string
  name: string
  purpose: string
  url: string
}

const subprocessors: readonly Subprocessor[] = [
  {
    logo: "/logos/subprocessors/convex.svg",
    name: "Convex",
    url: "https://convex.dev",
    purpose: "Stores workspace data and sessions.",
  },
  {
    logo: "/logos/subprocessors/cloudflare.svg",
    name: "Cloudflare",
    url: "https://www.cloudflare.com/cloudflare-customer-dpa/",
    purpose: "Stores files.",
  },
  {
    logo: "/logos/subprocessors/turbopuffer.svg",
    name: "turbopuffer",
    url: "https://turbopuffer.com/docs/security",
    purpose: "Indexes content for search.",
  },
  {
    ink: true,
    logo: "/logos/subprocessors/vercel.svg",
    name: "Vercel",
    url: "https://vercel.com/legal/dpa",
    purpose: "Hosts and serves the application.",
  },
  {
    logo: "/logos/subprocessors/blaxel.svg",
    name: "Blaxel",
    url: "https://blaxel.ai",
    purpose: "Runs sandboxed code.",
  },
  {
    ink: true,
    logo: "/logos/subprocessors/bird.svg",
    name: "Bird",
    url: "https://bird.com",
    purpose: "Sends Jori's email.",
  },
  {
    logo: "/logos/subprocessors/parallel.svg",
    name: "Parallel",
    url: "https://trust.parallel.ai",
    purpose: "Runs web searches and fetches pages.",
  },
  {
    ink: true,
    logo: "/logos/subprocessors/openrouter.svg",
    name: "OpenRouter",
    url: "https://openrouter.ai",
    purpose: "Routes model calls to providers.",
  },
  {
    logo: "/logos/subprocessors/google.png",
    name: "Google Cloud",
    url: "https://cloud.google.com/terms/data-processing-addendum",
    purpose: "Generates images from prompts.",
  },
  {
    ink: true,
    logo: "/logos/subprocessors/polar.svg",
    name: "Polar",
    url: "https://polar.sh/legal/privacy-policy",
    purpose: "Sells Jori and handles payments and tax.",
  },
  {
    dark: "/logos/subprocessors/posthog-dark.svg",
    logo: "/logos/subprocessors/posthog.svg",
    name: "PostHog",
    url: "https://posthog.com",
    purpose: "Measures usage, if you opt in.",
  },
  {
    logo: "/logos/subprocessors/zoho.svg",
    name: "Zoho",
    url: "https://www.zoho.com/privacy.html",
    purpose: "Hosts the support mailbox.",
  },
]

export function Subprocessors() {
  return (
    <ul className="mt-0.5 grid gap-2.5">
      {subprocessors.map(({ dark, ink, logo, name, purpose, url }) => (
        // Each row is one line, so the mark centers against it rather than
        // hanging from a hand-tuned offset that only holds at one text size.
        <li className="flex items-center gap-2.5" key={name}>
          <LogoImage
            className="size-4 object-contain"
            dark={dark}
            ink={ink}
            src={logo}
          />
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
