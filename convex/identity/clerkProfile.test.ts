import { describe, expect, test } from "vitest"
import { readVerifiedClerkEmails } from "./clerkProfile"

describe("Clerk profile email parsing", () => {
  test("keeps only verified email addresses", () => {
    expect(
      readVerifiedClerkEmails({
        email_addresses: [
          {
            id: "idn_verified",
            email_address: " VEDIN.LABS@gmail.com ",
            verification: { status: "verified" },
          },
          {
            id: "idn_unverified",
            email_address: "unverified@example.com",
            verification: { status: "unverified" },
          },
          {
            id: "idn_missing_status",
            email_address: "missing@example.com",
          },
        ],
      })
    ).toEqual([
      {
        externalId: "idn_verified",
        email: "vedin.labs@gmail.com",
      },
    ])
  })
})
