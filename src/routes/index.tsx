import { createFileRoute } from "@tanstack/react-router"
import { Landing } from "@/landing/home"
import { regionConfig } from "@/shared/region/config"
import { marketingUrl } from "@/shared/region/paths"

const title = "Jori · The shared drive your AI works out of"
const description =
  "Describe recurring work in plain language. Jori runs jobs beside the tables and files they use. Share folders with your team and track AI spending."
const url = marketingUrl()
const organizationId = new URL("#organization", url).toString()

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": organizationId,
              name: "Jori",
              url,
              logo: {
                "@type": "ImageObject",
                url: new URL(
                  "/brand/avatar/avatar-light-512.png",
                  regionConfig.publicOrigin
                ).toString(),
                width: 512,
                height: 512,
                encodingFormat: "image/png",
              },
            },
            {
              "@type": "WebSite",
              "@id": new URL("#website", url).toString(),
              name: "Jori",
              url,
              publisher: { "@id": organizationId },
            },
          ],
        },
      },
    ],
  }),
})
