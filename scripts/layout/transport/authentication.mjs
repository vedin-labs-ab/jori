import { app, click, noOrganization, retry } from "./scenario.mjs"
export const cases = [
  {
    scenario: app(
      "shell-auth-boundary-no-org",
      "No memberships with allowed address reaches organization chooser",
      "/chat"
    ),
    transport: {
      faultRules: noOrganization,
      queryRules: [
        {
          udfPath: "access/gate:status",
          persistent: true,
          transform: (value) => ({ ...value, allowed: true }),
        },
      ],
    },
    description:
      "Browser-only zero memberships and allowed=true query; no backend access or organization creation.",
  },
  {
    scenario: app(
      "shell-auth-boundary-convex",
      "Outer cached session and raw auth cache disagreement reaches session error",
      "/chat"
    ),
    transport: () => {
      let replies = 0
      return {
        faultRules: [
          {
            url: "http://localhost:5178/api/auth/get-session*",
            persistent: true,
            transform: (value) => (++replies === 2 ? null : value),
          },
        ],
      }
    },
    description:
      "Real session prefetch preserved; second measured get-session response becomes browser-only null once. Tests actual two-cache disagreement without changing backend session. Provisional until preflight proves target.",
  },
  {
    scenario: app(
      "shell-auth-boundary-activation",
      "Missing active-organization response triggers automatic activation and reload",
      "/chat"
    ),
    transport: {
      faultRules: [
        {
          url: "http://localhost:5178/api/auth/organization/get-full-organization*",
          status: 200,
          body: "null",
        },
        {
          url: "http://localhost:5178/api/auth/organization/set-active",
          status: 200,
          body: "null",
        },
      ],
    },
    description:
      "One browser-only null active-org response plus intercepted successful activation POST; real membership list and post-reload active organization pass through, backend session unchanged.",
  },
  {
    scenario: app(
      "shell-auth-boundary-init-failure",
      "First member initialization sync fails to workspace alert",
      "/chat"
    ),
    transport: { mutationFailures: [{ udfPath: "persons/account:sync" }] },
    description:
      "First measured member sync blocked before network send; client receives a transient MutationResponse failure.",
  },
  {
    scenario: {
      ...app(
        "shell-auth-boundary-init-retry",
        "Workspace initialization Try again succeeds",
        "/chat",
        [click(retry)]
      ),
      mutating: true,
    },
    transport: { mutationFailures: [{ udfPath: "persons/account:sync" }] },
    description:
      "First sync blocked before backend; retry forwards normal authorized app member initialization.",
  },
  {
    scenario: app(
      "shell-auth-boundary-launch",
      "Launch gate for authenticated not-yet-allowed account",
      "/chat"
    ),
    transport: {
      faultRules: noOrganization,
      queryRules: [
        {
          udfPath: "access/gate:status",
          persistent: true,
          transform: (value) => ({ ...value, allowed: false }),
        },
      ],
    },
    description:
      "Browser-only zero-membership responses plus allowed=false access status; no backend membership/access mutation.",
  },
  {
    scenario: app(
      "shell-auth-boundary-onboarding",
      "Organization welcome modal opens for metadata flag false",
      "/chat"
    ),
    transport: {
      faultRules: [
        {
          url: "http://localhost:5178/api/auth/organization/get-full-organization*",
          persistent: true,
          transform: (value) => {
            if (!value) {
              return value
            }
            let metadata = value.metadata
            try {
              metadata =
                typeof metadata === "string" ? JSON.parse(metadata) : metadata
            } catch {
              metadata = {}
            }
            return { ...value, metadata: { ...metadata, onboarded: false } }
          },
        },
      ],
    },
    description:
      "Response-stage transform changes only browser organization.metadata.onboarded=false; modal is not dismissed.",
  },
  {
    scenario: {
      ...app(
        "shell-sign-out",
        "Sign out through actual hook with context-only cookie expiry",
        "/chat",
        [{ action: "navigate", value: "http://localhost:5178/sign-out" }]
      ),
      mutating: true,
      setupReady: [
        { selector: 'button[aria-label="Mention a resource"]', timeout: 45000 },
      ],
      ready: [
        { selector: 'button:text-is("Continue with Google")', timeout: 45000 },
      ],
    },
    transport: { signoutFixture: true },
    description:
      "Actual SignOut component and useSignOutFlow hook; exact sign-out POST fulfilled only in browser after expiring that isolated context auth cookies. Shared backend session unchanged.",
  },
  {
    scenario: {
      ...app(
        "shell-sign-out-back",
        "Browser Back after context-only signout remains signed out",
        "/chat",
        [{ action: "back" }]
      ),
      setup: [{ action: "navigate", value: "http://localhost:5178/sign-out" }],
      setupReady: [
        { selector: 'button:text-is("Continue with Google")', timeout: 45000 },
      ],
      ready: [
        { selector: 'button:text-is("Continue with Google")', timeout: 45000 },
      ],
    },
    transport: { signoutFixture: true },
    description:
      "Same context-only signout, then browser Back to protected chat. Anonymous boundary redirects to sign-in; real backend session remains valid for other browser contexts.",
  },
]
