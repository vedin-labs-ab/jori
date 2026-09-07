// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { SignInLegalNotice } from "@/shared/auth/guidance"
import { LandingHeader } from "./header"

const createAuthClient = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Marketing must not create an auth client")
  })
)
vi.mock("better-auth/react", () => ({ createAuthClient }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock("@/shared/region/config", () => ({
  regionConfig: { publicOrigin: "https://usejori.com" },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

test("marketing renders sign-in as full navigation without querying either regional session", () => {
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  render(<LandingHeader onWaitlistPage />)
  expect(
    screen.getByRole("link", { name: "Sign in" }).getAttribute("href")
  ).toBe("https://usejori.com/sign-in")
  expect(
    screen.getByRole("link", { name: "Jori home" }).getAttribute("href")
  ).toBe("https://usejori.com/")
  expect(createAuthClient).not.toHaveBeenCalled()
  expect(fetcher).not.toHaveBeenCalled()
})

test("regional sign-in legal links point back to public marketing", () => {
  render(<SignInLegalNotice />)
  expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe(
    "https://usejori.com/terms"
  )
  expect(
    screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")
  ).toBe("https://usejori.com/privacy")
})
