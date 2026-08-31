import { expect, test } from "vitest"
import { type MaterialModeInput, resolveMaterialMode } from "./mode"

/** A signed-in member of an organization, reached through a plain console
 *  link. Each test names only what it changes. */
function member(overrides: Partial<MaterialModeInput> = {}): MaterialModeInput {
  return {
    hasOrganization: true,
    isConvexAuthenticated: true,
    isConvexLoading: false,
    isOrganizationPending: false,
    isSessionPending: false,
    isSignedIn: true,
    secret: null,
    ...overrides,
  }
}

test("a member reaching a material directly gets the console", () => {
  expect(resolveMaterialMode(member())).toBe("console")
})

test("a member following a share link still gets the console", () => {
  expect(resolveMaterialMode(member({ secret: "abc" }))).toBe("console")
})

test("an anonymous visitor gets the share view", () => {
  expect(
    resolveMaterialMode(
      member({ isSignedIn: false, hasOrganization: false, secret: "abc" })
    )
  ).toBe("share")
})

test("an anonymous visitor without a link still gets the share view", () => {
  expect(
    resolveMaterialMode(member({ isSignedIn: false, hasOrganization: false }))
  ).toBe("share")
})

test("the hash decides nothing until it has been read", () => {
  expect(resolveMaterialMode(member({ secret: undefined }))).toBe("resolving")
})

test("a pending session decides nothing", () => {
  expect(resolveMaterialMode(member({ isSessionPending: true }))).toBe(
    "resolving"
  )
})

test("a member without a link never waits on the organization", () => {
  expect(
    resolveMaterialMode(
      member({ hasOrganization: false, isOrganizationPending: true })
    )
  ).toBe("console")
})

test("a share link waits for the organization before choosing", () => {
  expect(
    resolveMaterialMode(member({ isOrganizationPending: true, secret: "abc" }))
  ).toBe("resolving")
})

test("a share link waits for Convex before choosing", () => {
  expect(
    resolveMaterialMode(member({ isConvexLoading: true, secret: "abc" }))
  ).toBe("resolving")
})

test("a signed-in visitor with no organization reads the link instead", () => {
  expect(
    resolveMaterialMode(member({ hasOrganization: false, secret: "abc" }))
  ).toBe("share")
})

test("a session Convex rejected reads the link instead", () => {
  expect(
    resolveMaterialMode(member({ isConvexAuthenticated: false, secret: "abc" }))
  ).toBe("share")
})
