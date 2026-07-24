import { HOUR, RateLimiter } from "@convex-dev/rate-limiter"
import { components } from "../_generated/api"

/**
 * The waitlist is the one endpoint a stranger is meant to reach, so a rate
 * ceiling stands in for caller identity.
 *
 * Per address is the limit that matters: it is keyed by the caller's IP, so
 * one abuser cannot lock anyone else out. The capacity leaves room for a
 * typo, a correction, and a few colleagues behind one office address, and
 * still stops enumeration cold.
 *
 * Total is a backstop, deliberately far above any real launch day. It exists
 * because a distributed flood defeats a per-address limit, and the cost of
 * that is Milo's outbound mail reputation, not just a full table.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  waitlistSignupPerAddress: {
    kind: "token bucket",
    rate: 10,
    period: HOUR,
    capacity: 5,
  },
  waitlistSignupTotal: {
    kind: "token bucket",
    rate: 2000,
    period: HOUR,
    capacity: 200,
    shards: 10,
  },
})
