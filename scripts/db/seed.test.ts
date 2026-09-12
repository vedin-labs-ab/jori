import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

test.each([[], [""], ["   "], ["--help"], ["--unknown"]])(
  "rejects a missing organization ID instead of seeding the default organization: %j",
  (...value) => {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        fileURLToPath(new URL("./seed.ts", import.meta.url)),
        "--organization",
        ...value,
      ],
      {
        encoding: "utf8",
        env: { CONVEX_DEPLOYMENT: "prod:synthetic" },
      }
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      "--organization requires an organization ID."
    )
    expect(result.stdout).not.toContain("Seeding the development deployment")
  }
)
