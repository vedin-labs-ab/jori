/**
 * Who else touches the data, and for what.
 *
 * Marks come from the vendors' official assets, fitted without cropping.
 * This is a platform-provider summary, not a substitute for the DPA register.
 */
const subprocessors = [
  {
    logo: "/logos/subprocessors/convex.svg",
    name: "Convex",
    url: "https://convex.dev",
    purpose: "Stores the data, including sign-in sessions.",
  },
  {
    logo: "/logos/subprocessors/vercel.svg",
    name: "Vercel",
    url: "https://vercel.com/legal/dpa",
    purpose: "Hosts the application and serves requests through its CDN.",
  },
  {
    logo: "/logos/subprocessors/blaxel.svg",
    name: "Blaxel",
    url: "https://blaxel.ai",
    purpose: "Runs sandboxed code in your workspace's region.",
  },
  {
    logo: "/logos/subprocessors/bird.svg",
    name: "Bird",
    url: "https://bird.com",
    purpose: "Delivers Jori's email.",
  },
  {
    logo: "/logos/subprocessors/exa.svg",
    name: "Exa",
    url: "https://exa.ai/docs/reference/security",
    purpose: "Processes web-search queries and fetches requested pages.",
  },
  {
    logo: "/logos/subprocessors/openrouter.svg",
    name: "OpenRouter",
    url: "https://openrouter.ai",
    purpose: "Routes model calls to the provider.",
  },
  {
    logo: "/logos/subprocessors/google.png",
    name: "Google Cloud",
    url: "https://cloud.google.com/terms/data-processing-addendum",
    purpose: "Processes image-generation prompts and creates images.",
  },
  {
    logo: "/logos/subprocessors/posthog.svg",
    name: "PostHog",
    url: "https://posthog.com",
    purpose: "Measures website and product usage.",
  },
  {
    logo: "/logos/subprocessors/stripe.svg",
    name: "Stripe",
    url: "https://stripe.com/privacy",
    purpose:
      "Handles billing and payments, including its own legal obligations.",
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
