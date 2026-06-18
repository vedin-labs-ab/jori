import { cruise, type IFlattenedRuleSet } from "dependency-cruiser"

const roots = ["src", "convex", "contracts", "runtime/source", "scripts"]
const excludedPaths = [
  "(^|/)node_modules(/|$)",
  "(^|/)dist(/|$)",
  "(^|/)_generated(/|$)",
  "[.]test[.](?:ts|tsx|js|jsx)$",
  "^runtime/source/artifact/template(/|$)",
].join("|")

const ruleSet = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Cycles blur ownership and make layers harder to change.",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "contracts-are-shared-kernel",
      severity: "error",
      comment: "Contracts must stay runtime-neutral.",
      from: {
        path: "^contracts/",
      },
      to: {
        path: "^(?:src|convex|runtime|scripts)(?:/|$)",
      },
    },
    {
      name: "runtime-does-not-import-app",
      severity: "error",
      comment:
        "Runtime source may depend on contracts, not app or Convex code.",
      from: {
        path: "^runtime/source/",
      },
      to: {
        path: "^(?:src|convex)(?:/|$)",
      },
    },
    {
      name: "providers-do-not-import-broker",
      severity: "error",
      comment: "Provider API code should be below broker tool adapters.",
      from: {
        path: "^convex/providers/",
      },
      to: {
        path: "^convex/broker/",
      },
    },
    {
      name: "console-shared-is-feature-free",
      severity: "error",
      comment: "Console shared UI must not depend on console feature domains.",
      from: {
        path: "^src/console/shared/",
      },
      to: {
        path: "^src/console/(?:artifacts|automations|integrations|page|permissions|playbooks|runs|shell|skills|tools)(?:/|$)",
      },
    },
    {
      name: "app-shared-is-console-free",
      severity: "error",
      comment: "Root shared UI must remain reusable outside the console.",
      from: {
        path: "^src/shared/",
      },
      to: {
        path: "^src/console/",
      },
    },
  ],
} satisfies IFlattenedRuleSet

const result = await cruise(roots, {
  exclude: excludedPaths,
  outputType: "err-long",
  ruleSet,
  tsConfig: {
    fileName: "tsconfig.json",
  },
  validate: true,
})

if (result.exitCode === 0) {
  process.stdout.write("Dependency boundary check passed.\n")
} else {
  process.stderr.write(formatOutput(result.output))
  process.exitCode = result.exitCode
}

function formatOutput(output: unknown) {
  return typeof output === "string"
    ? output
    : `${JSON.stringify(output, null, 2)}\n`
}
