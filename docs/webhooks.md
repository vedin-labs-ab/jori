# Notion webhook setup

Notion delivers the webhook signing secret in an initial, unsigned verification
request. It must then be entered in the connection's Notion dashboard. Returning
the token in the HTTP response does not activate the subscription.

Jori's administrator-only setup commands provide one temporary slot in the owning
regional Convex deployment. No slot exists during normal operation. To activate
or rotate a subscription:

1. Target the intended deployment explicitly and invoke
   `integrations/notion/setup/index:begin`. Save the returned setup ID.
2. Immediately use **Resend token** in that region's Notion subscription dialog.
3. Read `integrations/notion/setup/index:read` with `{ "id": "SETUP_ID" }` through a
   private administrator pipe. Do not print the result in logs or chat.
4. Enter that candidate in Notion and confirm that Notion accepts it. Only then
   save it as `NOTION_WEBHOOK_VERIFICATION_TOKEN` in the matching Convex deployment.
5. Invoke `integrations/notion/setup/index:clear` with the setup ID, verify removal,
   and test signed delivery. Never copy the token to the other region.

The first well-formed candidate wins. It remains untrusted until Notion confirms
it, and capture never changes the active signing secret. An unsolicited candidate
cannot activate a subscription. If verification fails, clear the slot and begin
again. This bootstrap accepts unsigned deliveries only within an explicitly armed
ten-minute window; it is not an authenticity check on the candidate itself.

The temporary row expires after ten minutes and scheduled cleanup deletes it.
Expired tokens are unreadable even if cleanup is delayed. There is at most one
slot per deployment, and only internal functions can arm, read or clear it.
The HTTP endpoint neither returns nor logs the token. Normal event processing
continues to require the configured signature; setup never bypasses that check.

Source: [Notion webhook verification](https://developers.notion.com/reference/webhooks).
