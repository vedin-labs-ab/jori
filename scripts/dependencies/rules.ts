import { type IFlattenedRuleSet } from "dependency-cruiser"

export const ruleSet = {
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
        path: "^(?:src|convex|prompts|scripts)(?:/|$)",
      },
    },
    {
      name: "src-does-not-import-backend-or-scripts",
      severity: "error",
      comment:
        "App code may use generated Convex API refs, not backend or script internals.",
      from: {
        path: "^src/",
      },
      to: {
        path: "^(?:convex|prompts|scripts)(?:/|$)",
        pathNot: "^convex/_generated/",
      },
    },
    {
      name: "convex-does-not-import-app-or-scripts",
      severity: "error",
      comment: "Convex code must not depend on app or tooling code.",
      from: {
        path: "^convex/",
      },
      to: {
        path: "^(?:src|scripts)(?:/|$)",
      },
    },
    {
      name: "parallel-stays-in-search-adapter",
      severity: "error",
      comment:
        "Search consumers use the regional provider-neutral client, not Parallel SDK types or transport.",
      from: {
        path: "^convex/",
        pathNot: "^convex/search/(?:parallel|response)[.]ts$",
      },
      to: { path: "^node_modules/parallel-web(?:/|$)" },
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
    {
      name: "console-views-are-props-driven",
      severity: "error",
      comment:
        "Console views take props and raise callbacks; the console binds them to Convex and the session.",
      from: {
        path: "^src/shared/console/",
      },
      to: {
        path: "^(?:node_modules/convex/dist/[^/]+/react(?:/|$)|src/shared/session(?:/|$)|src/components/auth(?:/|$))",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "console-views-navigate-through-link",
      severity: "error",
      comment:
        "Console views reach the router only through ConsoleLink, so the same views render under a local navigation.",
      from: {
        path: "^src/shared/console/",
        pathNot: "^src/shared/console/shell/(?:link[.]tsx|location[.]ts)$",
      },
      to: {
        path: "^node_modules/@tanstack/react-router(?:/|$)",
      },
    },
  ],
} satisfies IFlattenedRuleSet
