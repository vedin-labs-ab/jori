import { app, click, missingChunk, reload, retry } from "./scenario.mjs"
export const cases = [
  {
    scenario: {
      ...app(
        "shell-share-files",
        "Anonymous fixture file share resolves public chrome",
        "/files/r170smqxya0f76g8z9xq4zyf718e53tk#share=layout-test-invalid"
      ),
      anonymous: true,
    },
    transport: {
      queryRules: [
        {
          udfPath: "files/share:get",
          persistent: true,
          transform: () => ({
            name: "Layout audit.txt",
            mimeType: "text/plain",
            size: 0,
            url: null,
            expiresAt: Date.now() + 3600000,
          }),
        },
      ],
    },
    description:
      "Real invalid share query returns no private data; browser-only synthetic metadata exercises actual FileShareView without minting a share.",
  },
  {
    scenario: {
      ...app(
        "shell-share-stores",
        "Anonymous fixture store share resolves public chrome",
        "/stores/s178zvfzcbmsjbw21ebftr8z4s8e574s#share=layout-test-invalid"
      ),
      anonymous: true,
    },
    transport: {
      queryRules: [
        {
          udfPath: "stores/share:get",
          persistent: true,
          transform: () => ({
            name: "Layout audit store",
            version: 1,
            value: { status: "Ready" },
            schema: { type: "object" },
            expiresAt: Date.now() + 3600000,
          }),
        },
      ],
    },
    description:
      "Real invalid share query returns no private data; browser-only synthetic store metadata exercises actual StoreShareView.",
  },
  {
    scenario: {
      ...app(
        "shell-share-tables",
        "Anonymous fixture table share resolves metadata and rows",
        "/tables/s175y1z04ag8dstaegys58e4yn8e5960#share=layout-test-invalid"
      ),
      anonymous: true,
    },
    transport: {
      queryRules: [
        {
          udfPath: "tables/share:get",
          persistent: true,
          transform: () => ({
            name: "Layout audit table",
            columns: [{ id: "name", name: "Name", type: "text" }],
            expiresAt: Date.now() + 3600000,
          }),
        },
        {
          udfPath: "tables/share:rows",
          persistent: true,
          transform: () => ({
            page: [
              { rowId: "layout-audit-row", values: { name: "Example row" } },
            ],
            isDone: true,
            continueCursor: "",
          }),
        },
      ],
    },
    description:
      "Invalid share reads are replaced only in the browser by synthetic table and row data; no shared backend mutation.",
  },
  {
    scenario: app(
      "shell-offer",
      "Invalid development offer reaches expired outcome",
      "/integrations/offers/layout-test-invalid"
    ),
    description:
      "Known-invalid token hash cannot match a generated 32-byte offer. claim checks find-by-token and throws before claimIntegrationOffer or writes.",
  },
  {
    scenario: app(
      "shell-offer-back",
      "Expired offer View integrations returns to console",
      "/integrations/offers/layout-test-invalid",
      [click('a:text-is("View integrations")')]
    ),
    description:
      "Same read-only invalid-token lookup followed by local navigation.",
  },
  {
    scenario: {
      ...app(
        "shell-error-root-retry",
        "Root error Reload recovers after route chunk returns",
        "/pricing",
        [click(reload)]
      ),
      anonymous: true,
    },
    transport: {
      faultRules: [missingChunk("pricing")],
      releaseOnSelector: reload,
    },
    description:
      "Persistent pricing chunk404 survives TanStack automatic reload; cleared immediately before original Reload action.",
  },
  {
    scenario: app(
      "shell-error-page-retry",
      "Transient job query error Try again recovers",
      "/jobs/sx7364b01whsmfbqrv9wvc1n3h8e5pmy",
      [click(retry)]
    ),
    transport: { queryRules: [{ udfPath: "jobs/console:get" }] },
    description:
      "First measured job get result becomes a client-only QueryFailed; later subscription result passes through.",
  },
  {
    scenario: {
      ...app(
        "shell-error-stale-retry",
        "Stale job route Reload recovers after chunk returns",
        "/chat",
        [click(reload)]
      ),
      setup: [
        click('[data-slot="sidebar-trigger"]'),
        click('a[href="/jobs"] >> nth=0'),
      ],
    },
    transport: {
      faultRules: [missingChunk("jobs")],
      releaseOnSelector: reload,
    },
    description:
      "Persistent jobs chunk404 during requested route entry; cleared immediately before original Reload action.",
  },
]
