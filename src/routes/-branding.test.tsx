// @vitest-environment jsdom
import { HeadContent, RouterProvider } from "@tanstack/react-router"
import { act, render, screen } from "@testing-library/react"
import { type ReactNode } from "react"
import { expect, test, vi } from "vitest"
import { regionConfig } from "@/shared/region/config"
import { setup } from "../../test/navigation"
import { Document } from "../../test/navigation/pages"

// Vitest does not emit CSS assets. Represent the missing asset as undefined
// so this metadata fixture neither emits an empty href nor waits for a load.
vi.mock("../styles.css?url", () => ({ default: undefined }))

function setupHead(path: string) {
  const router = setup(path)
  Object.assign(router.routesById.__root__.options, {
    shellComponent: ({ children }: { children: ReactNode }) => (
      <>
        <HeadContent />
        <Document>{children}</Document>
      </>
    ),
  })
  return router
}

function content(selector: string) {
  return document.querySelector(selector)?.getAttribute("content")
}

test("home previews use the page headline and one accessible image across social platforms", async () => {
  const router = setupHead("/?utm_source=launch")
  render(<RouterProvider router={router} />)

  await act(() => router.load())
  expect(await screen.findByTestId("page")).toBeDefined()

  expect(content('meta[property="og:title"]')).toBe(document.title)
  expect(content('meta[name="twitter:title"]')).toBe(document.title)
  expect(content('meta[name="twitter:description"]')).toBe(
    content('meta[property="og:description"]')
  )
  const image = content('meta[property="og:image"]')
  expect(content('meta[name="twitter:image"]')).toBe(image)
  expect(image).toBe(
    new URL("/brand/social/og-light.png", regionConfig.publicOrigin).toString()
  )
  const imageAlt = content('meta[property="og:image:alt"]')
  expect(imageAlt).toContain("shared folder")
  expect(content('meta[name="twitter:image:alt"]')).toBe(imageAlt)
  expect(content('meta[property="og:image:type"]')).toBe("image/png")
  expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
  expect(document.querySelectorAll('meta[name="twitter:title"]')).toHaveLength(
    1
  )
})

test("marketing navigation updates canonical identity and leaves app pages without a marketing canonical", async () => {
  const router = setupHead("/?utm_source=launch")
  render(<RouterProvider router={router} />)
  await act(() => router.load())
  expect(await screen.findByTestId("page")).toBeDefined()

  for (const path of ["/", "/pricing", "/trust", "/privacy", "/terms"]) {
    await act(() => router.navigate({ href: `${path}?utm_source=launch` }))
    const expected = new URL(path, regionConfig.publicOrigin).toString()
    const canonical = document.querySelectorAll('link[rel="canonical"]')
    expect(canonical).toHaveLength(1)
    expect(canonical[0]?.getAttribute("href")).toBe(expected)
    expect(content('meta[property="og:url"]')).toBe(expected)
  }

  expect(content('meta[name="twitter:title"]')).toBeUndefined()
  expect(
    document.querySelector('script[type="application/ld+json"]')
  ).toBeNull()

  await act(() => router.navigate({ to: "/sign-in" }))
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.querySelector('meta[property="og:url"]')).toBeNull()

  await act(() => router.navigate({ href: "/missing" }))
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.querySelector('meta[property="og:url"]')).toBeNull()
})

test("home structured data points to the public Jori identity and its dedicated square logo", async () => {
  const router = setupHead("/")
  render(<RouterProvider router={router} />)
  await act(() => router.load())
  expect(await screen.findByTestId("page")).toBeDefined()

  const script = document.querySelector('script[type="application/ld+json"]')
  const data = JSON.parse(script?.textContent ?? "null")
  const organization = data["@graph"].find(
    (entity: { "@type": string }) => entity["@type"] === "Organization"
  )
  const website = data["@graph"].find(
    (entity: { "@type": string }) => entity["@type"] === "WebSite"
  )

  expect(website.url).toBe(new URL("/", regionConfig.publicOrigin).toString())
  expect(organization.url).toBe(website.url)
  expect(website.publisher["@id"]).toBe(organization["@id"])
  expect(organization.logo.url).toBe(
    new URL(
      "/brand/avatar/avatar-light-512.png",
      regionConfig.publicOrigin
    ).toString()
  )
  expect(organization.logo.width).toBeGreaterThanOrEqual(112)
  expect(organization.logo.height).toBe(organization.logo.width)
})
