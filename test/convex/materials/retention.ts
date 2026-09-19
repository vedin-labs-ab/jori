/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, vi } from "vitest"
import authSchema from "../../../convex/betterauth/schema"
import schema from "../../../convex/schema"
import { registerBlobs } from "./blobs"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const authModules = import.meta.glob("/convex/betterauth/**/*.{ts,js}")

export function retentionTest() {
  const t = convexTest(schema, modules)
  registerBlobs(t)
  t.registerComponent("betterAuth", authSchema, authModules)
  return t
}

export function retentionClock() {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-19T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })
}
