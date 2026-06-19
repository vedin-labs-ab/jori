import { cruise, type IFlattenedRuleSet } from "dependency-cruiser"

const roots = ["src", "convex", "contracts", "runtime/source", "scripts"]
const excludedPaths = [
  "(^|/)[.]agents(/|$)",
  "(^|/)[.]claude(/|$)",
  "(^|/)[.]trigger(/|$)",
  "(^|/)[.]tanstack(/|$)",
  "(^|/)node_modules(/|$)",
  "(^|/)dist(/|$)",
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
      name: "src-does-not-import-backend-runtime-or-scripts",
      severity: "error",
      comment:
        "App code may use generated Convex API refs, not backend, runtime, or script internals.",
      from: {
        path: "^src/",
      },
      to: {
        path: "^(?:convex|runtime|scripts)(?:/|$)",
        pathNot: "^convex/_generated/",
      },
    },
    {
      name: "convex-does-not-import-app-runtime-or-scripts",
      severity: "error",
      comment:
        "Convex code must stay independent from app, runtime, and tooling code.",
      from: {
        path: "^convex/",
      },
      to: {
        path: "^(?:src|runtime|scripts)(?:/|$)",
      },
    },
    {
      name: "runtime-does-not-import-app-backend-or-scripts",
      severity: "error",
      comment:
        "Runtime source may depend on contracts, not app, Convex, or script code.",
      from: {
        path: "^runtime/source/",
      },
      to: {
        path: "^(?:src|convex|scripts)(?:/|$)",
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
      name: "ui-primitives-stay-generic",
      severity: "error",
      comment:
        "Generic UI primitives must not depend on product, route, or shared app layers.",
      from: {
        path: "^src/components/ui/",
      },
      to: {
        path: "^src/(?:console|routes|landing|shared)(?:/|$)",
      },
    },
    {
      name: "lib-stays-leaf",
      severity: "error",
      comment:
        "Generic utilities must not depend on UI, product, route, or shared app layers.",
      from: {
        path: "^src/lib/",
      },
      to: {
        path: "^src/(?:console|components|routes|landing|shared)(?:/|$)",
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
