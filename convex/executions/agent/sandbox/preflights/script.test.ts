import { expect, test } from "vitest"
import { createTokenPreflightCommand } from "./script"

test("generates a bearer GET preflight script", () => {
  const command = createTokenPreflightCommand({
    tokenEnv: "MILO_EXAMPLE_TOKEN",
    missingTokenError: "Missing Example token",
    url: "https://api.example.com/me",
    headers: { "x-example-version": "2026-01-01" },
    failureLabel: "Example token",
    successMessage: "Example token preflight passed",
  })

  expect(command).toBe(
    [
      "node <<'NODE'",
      "async function main() {",
      "  const token = process.env.MILO_EXAMPLE_TOKEN;",
      "  if (!token) {",
      '    throw new Error("Missing Example token");',
      "  }",
      '  const response = await fetch("https://api.example.com/me", {',
      "    headers: {",
      "      authorization: 'Bearer ' + token,",
      '      "x-example-version": "2026-01-01",',
      "    },",
      "  });",
      "  const body = await response.json();",
      "  if (!response.ok) {",
      "    throw new Error(\"Example token\" + ' preflight failed: ' + JSON.stringify(body));",
      "  }",
      '  console.log("Example token preflight passed");',
      "}",
      "main().catch((error) => {",
      "  console.error(error);",
      "  process.exit(1);",
      "});",
      "NODE",
    ].join("\n")
  )
})

test("generates a POST preflight script with an extra failure condition", () => {
  const command = createTokenPreflightCommand({
    tokenEnv: "MILO_EXAMPLE_TOKEN",
    missingTokenError: "Missing Example token",
    url: () => "https://api.example.com/graphql",
    body: { query: "{ viewer { id } }" },
    failureCondition: "body.errors",
    failureLabel: "Example token",
    successMessage: "Example token preflight passed",
  })

  expect(command).toContain("    method: 'POST',")
  expect(command).toContain(
    `    body: "{\\"query\\":\\"{ viewer { id } }\\"}",`
  )
  expect(command).toContain("  if (!response.ok || body.errors) {")
  expect(command).toContain('await fetch("https://api.example.com/graphql", {')
})
