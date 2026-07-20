import { cruise, type IFlattenedRuleSet } from "dependency-cruiser"

const roots = [
  "src",
  "convex",
  "contracts",
  "runtime/artifacts",
  "trigger",
  "prompts",
  "scripts",
]
const excludedPaths = [
  "(^|/)[.]agents(/|$)",
  "(^|/)[.]claude(/|$)",
  "(^|/)[.]trigger(/|$)",
  "(^|/)[.]tanstack(/|$)",
  "(^|/)node_modules(/|$)",
  "(^|/)dist(/|$)",
  "[.]test[.](?:ts|tsx|js|jsx)$",
  "^runtime/artifacts/template(/|$)",
  // Vendored better-auth-ui registry code, kept as installed; its internal
  // wiring (plugin <-> settings views) is upstream's to govern.
  "^src/components/auth(/|$)",
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
        viaOnly: {
          dependencyTypesNot: ["type-only", "pre-compilation-only"],
        },
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
        path: "^(?:src|convex|runtime|trigger|prompts|scripts)(?:/|$)",
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
        path: "^(?:convex|runtime|trigger|prompts|scripts)(?:/|$)",
        pathNot: "^convex/_generated/",
      },
    },
    {
      name: "convex-does-not-import-app-runtime-or-scripts",
      severity: "error",
      comment:
        "Convex code may consume generated runtime assets, not app, runtime source, Trigger, or tooling code.",
      from: {
        path: "^convex/",
      },
      to: {
        path: "^(?:src|runtime|trigger|scripts)(?:/|$)",
        pathNot: "^runtime/artifacts/_generated/",
      },
    },
    {
      name: "runtime-does-not-import-app-backend-or-scripts",
      severity: "error",
      comment:
        "Runtime source may depend on contracts, not app, Convex, or script code.",
      from: {
        path: "^runtime/artifacts/",
      },
      to: {
        path: "^(?:src|convex|trigger|prompts|scripts)(?:/|$)",
      },
    },
    {
      name: "trigger-does-not-import-app-backend-runtime-or-scripts",
      severity: "error",
      comment:
        "Trigger worker code may use contracts, prompts, generated Convex API refs, and generated runtime assets, not app, backend, runtime source, or script internals.",
      from: {
        path: "^trigger/",
      },
      to: {
        path: "^(?:src|convex|runtime|scripts)(?:/|$)",
        pathNot: "^(?:convex/_generated/|runtime/artifacts/_generated/)",
      },
    },
    {
      name: "integrations-do-not-import-broker",
      severity: "error",
      comment: "Integration adapters should be below broker tool adapters.",
      from: {
        path: "^convex/integrations/",
      },
      to: {
        path: "^convex/broker/",
      },
    },
    {
      name: "offer-core-does-not-import-provider-adapters",
      severity: "error",
      comment:
        "Generic integration-offer state should not depend on provider presentation or transport.",
      from: {
        path: "^convex/integrations/offers/",
      },
      to: {
        path: "^convex/integrations/(?:github|google|linear|microsoft|notion|slack)/",
      },
    },
    {
      name: "transitions-do-not-import-integration-adapters",
      severity: "error",
      comment: "Transition persistence stays provider-free.",
      from: { path: "^convex/transitions/" },
      to: { path: "^convex/integrations/" },
    },
    {
      name: "deduction-does-not-import-workstream-projection",
      severity: "error",
      comment:
        "The product-facing workstream projection may read deduction internals, not the reverse.",
      from: {
        path: "^convex/deduction/",
      },
      to: {
        path: "^convex/workstreams/",
      },
    },
    {
      name: "trigger-core-does-not-import-convex-adapter",
      severity: "error",
      comment:
        "Only task composition may bind Trigger core ports to the Convex adapter.",
      from: {
        path: "^trigger/(?!convex(?:/|$)|tasks(?:/|$))",
      },
      to: {
        path: "^trigger/convex/",
      },
    },
    {
      name: "features-do-not-import-routes",
      severity: "error",
      comment: "Framework routes compose product features, never the reverse.",
      from: {
        path: "^src/(?:components|console|hooks|landing|lib|shared)(?:/|$)",
      },
      to: {
        path: "^src/routes/",
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
        path: "^src/console/(?!shared(?:/|$))",
      },
    },
    {
      name: "landing-is-console-free",
      severity: "error",
      comment:
        "Public product UI must not depend on authenticated console code.",
      from: {
        path: "^src/landing/",
      },
      to: {
        path: "^src/console/",
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
  tsPreCompilationDeps: "specify",
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
