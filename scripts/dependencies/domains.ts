import { type IFlattenedRuleSet } from "dependency-cruiser"

export const domainRules = [
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
    name: "message-core-does-not-import-adapters",
    severity: "error",
    comment:
      "Message records consume normalized input; provider interpretation belongs to integration adapters.",
    from: { path: "^convex/messages/" },
    to: { path: "^convex/integrations/" },
  },
  {
    name: "communication-records-do-not-import-adapters",
    severity: "error",
    comment:
      "Intake and execution compose adapters; conversation, session, and reaction persistence take resolved values.",
    from: {
      path: "^convex/(?:conversations/records|sessions/(?:data|batch|read)|reactions/(?:data|apply))[.]ts$",
    },
    to: { path: "^convex/integrations/" },
  },
  {
    name: "session-policy-does-not-import-console",
    severity: "error",
    comment:
      "Session persistence and reconciliation use conversation execution policy, not console adapters.",
    from: {
      path: "^convex/(?:sessions/|conversations/execution/(?:principal|sharing)[.]ts$)",
    },
    to: { path: "^convex/[^/]+/console(?:/|[.]ts$)" },
  },
  {
    name: "run-visibility-does-not-import-console",
    severity: "error",
    comment: "Run authorization owns its policy; console filters consume it.",
    from: { path: "^convex/runs/visibility[.]ts$" },
    to: { path: "^convex/[^/]+/console(?:/|[.]ts$)" },
  },
  {
    name: "mentions-and-references-do-not-import-chat",
    severity: "error",
    comment:
      "References and mentions serve chat and job editors without importing chat internals.",
    from: { path: "^src/shared/console/(?:mentions|references)/" },
    to: { path: "^src/shared/console/chat/" },
  },
  {
    name: "blaxel-sdk-stays-in-adapter",
    severity: "error",
    comment: "Sandbox consumers use the adapter's normalized operations.",
    from: {
      path: "^convex/",
      pathNot: "^convex/runtime/sandbox/blaxel/",
    },
    to: { path: "^node_modules/@blaxel/core(?:/|$)" },
  },
  {
    name: "runtime-platform-contract-does-not-import-implementation",
    severity: "error",
    comment:
      "The runtime interface is independent of its construction and concrete adapters, including type imports.",
    from: { path: "^convex/runtime/platform/types[.]ts$" },
    to: {
      path: "^convex/(?:integrations/|broker/|runtime/)",
      pathNot: "^convex/runtime/sandbox/types[.]ts$",
    },
  },
  {
    name: "runtime-helpers-use-platform-contract",
    severity: "error",
    comment:
      "Tools and traces use the platform interface; only assembly selects its concrete implementation.",
    from: { path: "^convex/runtime/(?:tools|trace)/" },
    to: {
      path: "^convex/runtime/platform/",
      pathNot: "^convex/runtime/platform/types[.]ts$",
    },
  },
  {
    name: "shared-does-not-import-domains",
    severity: "error",
    comment:
      "Backend shared utilities stay below domain policy, including retention-aware writes.",
    from: { path: "^convex/shared/" },
    to: { path: "^convex/", pathNot: "^convex/(?:shared|_generated)/" },
  },
  {
    name: "collection-core-does-not-import-kinds",
    severity: "error",
    comment:
      "Table and store adapters provide KindSpec; collection persistence never selects a concrete kind implementation.",
    from: { path: "^convex/collections/" },
    to: { path: "^convex/(?:tables|stores)/" },
  },
] satisfies NonNullable<IFlattenedRuleSet["forbidden"]>
