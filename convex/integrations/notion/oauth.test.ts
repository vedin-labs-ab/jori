import { expect, test } from "vitest"
import { type NotionTokenResponse, readNotionSetupIdentity } from "./oauth"

test("reads setup identity from Notion OAuth user owners", () => {
  expect(
    readNotionSetupIdentity(
      token({
        owner: {
          type: "user",
          user: {
            id: "notion-user",
            name: " Albin ",
            person: { email: " albin@example.com " },
          },
        },
      })
    )
  ).toEqual({
    externalId: "notion-user",
    email: "albin@example.com",
    name: "Albin",
  })
})

test("skips setup identity for non-user Notion token owners", () => {
  expect(readNotionSetupIdentity(token())).toBeUndefined()
  expect(
    readNotionSetupIdentity(token({ owner: { type: "workspace" } }))
  ).toBeUndefined()
})

function token(
  overrides: Partial<
    Extract<NotionTokenResponse, { access_token: string }>
  > = {}
): NotionTokenResponse {
  return {
    access_token: "access",
    token_type: "bearer",
    refresh_token: null,
    bot_id: "bot",
    workspace_icon: null,
    workspace_name: null,
    workspace_id: "workspace",
    duplicated_template_id: null,
    ...overrides,
  }
}
