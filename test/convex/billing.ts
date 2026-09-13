/** An organization on a plan, with usage to spend. Fixtures that start a
 *  run seed one, because an organization that has bought nothing runs
 *  nothing. */
export function subscribedAccount(organizationId: string) {
  return {
    organizationId,
    state: {
      kind: "active" as const,
      plan: "starter" as const,
      interval: "month" as const,
    },
    micros: { allowance: 15_000_000, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
  }
}
