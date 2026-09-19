import actionRetrier from "@convex-dev/action-retrier/test"
import r2 from "@convex-dev/r2/test"
import { type GenericSchema, type SchemaDefinition } from "convex/server"
import { type TestConvex } from "convex-test"
import { vi } from "vitest"
import { bucket } from "../../../convex/files/blobs/fixtures"

/** Registers the R2 component and the settings files/blobs reads. Seed and
 *  inspect blobs with convex/files/blobs/fixtures. */
export function registerBlobs(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>
) {
  r2.register(t)
  // The component retries its storage deletes through a child of its own.
  actionRetrier.register(t, "r2/actionRetrier")
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("R2_ACCOUNT_ID", "account")
  vi.stubEnv("R2_BUCKET", bucket)
  vi.stubEnv("R2_ACCESS_KEY_ID", "access-key")
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-key")
}
