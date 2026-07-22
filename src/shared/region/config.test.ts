import { expect, test } from "vitest"
import { createRegionConfig, requireRegionOrigin } from "./config"

test("uses a simple US-only localhost setup during development", () => {
  const config = createRegionConfig({}, true)

  expect(config.current).toBe("us")
  expect([...config.enabled]).toEqual(["us"])
  expect(config.publicOrigin).toBe("http://localhost:5173")
  expect(requireRegionOrigin(config, "us")).toBe("http://localhost:5173")
  expect(config.origins.eu).toBeUndefined()
})

test("reads a complete regional production topology", () => {
  const config = createRegionConfig(
    {
      VITE_MILO_ENABLED_REGIONS: "us, eu",
      VITE_MILO_EU_ORIGIN: "https://eu.milo.example",
      VITE_MILO_PUBLIC_ORIGIN: "https://milo.example/",
      VITE_MILO_REGION: "eu",
      VITE_MILO_US_ORIGIN: "https://us.milo.example",
    },
    false
  )

  expect(config.current).toBe("eu")
  expect([...config.enabled]).toEqual(["us", "eu"])
  expect(config.publicOrigin).toBe("https://milo.example")
  expect(config.origins.eu).toBe("https://eu.milo.example")
})

test("requires explicit production identity and origins", () => {
  expect(() => createRegionConfig({}, false)).toThrow(
    'VITE_MILO_REGION must be "us" or "eu".'
  )
})

test("rejects a disabled current region", () => {
  expect(() =>
    createRegionConfig(
      {
        VITE_MILO_EU_ORIGIN: "https://eu.milo.example",
        VITE_MILO_PUBLIC_ORIGIN: "https://milo.example",
        VITE_MILO_REGION: "eu",
        VITE_MILO_US_ORIGIN: "https://us.milo.example",
      },
      false
    )
  ).toThrow("Current region eu must be enabled.")
})

test("rejects origins containing paths", () => {
  expect(() =>
    createRegionConfig(
      {
        VITE_MILO_PUBLIC_ORIGIN: "https://milo.example/welcome",
        VITE_MILO_REGION: "us",
        VITE_MILO_US_ORIGIN: "https://us.milo.example",
      },
      false
    )
  ).toThrow("VITE_MILO_PUBLIC_ORIGIN must be an http(s) origin")
})

test("keeps enabled regional origins isolated", () => {
  expect(() =>
    createRegionConfig(
      {
        VITE_MILO_ENABLED_REGIONS: "us,eu",
        VITE_MILO_EU_ORIGIN: "https://milo.example",
        VITE_MILO_PUBLIC_ORIGIN: "https://www.milo.example",
        VITE_MILO_REGION: "us",
        VITE_MILO_US_ORIGIN: "https://milo.example",
      },
      false
    )
  ).toThrow("Enabled regions must use distinct origins.")
})
