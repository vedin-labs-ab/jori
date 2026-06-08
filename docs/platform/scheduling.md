# Scheduling

## Responsibility

Stores future Milo work that users manage through Milo itself.

## Timing

Schedules are either:

- `oneShot`: runs once at an ISO timestamp in UTC.
- `recurring`: stores a five-field cron expression interpreted in UTC.

Recurring schedules use Convex scheduled functions by scheduling the next due run with `ctx.scheduler.runAt`. When the schedule fires, Milo creates a normal execution and schedules the following run from the stored cron expression.

## Output

Each schedule stores an explicit output target. Slack is the only supported target for now:

```ts
{
  type: "slack",
  channelId: string,
  threadId?: string,
}
```

If the user does not specify exactly where output should be published, Milo asks for clarification before creating or updating a schedule.

## MCP

Every active execution receives a one-time Milo MCP token. Convex stores only its hash on the execution and the `/milo/mcp` HTTP action resolves the tenant from that active execution token.

The Milo MCP currently exposes schedule tools:

- `add_schedule`
- `search_schedules`
- `read_schedule`
- `update_schedule`
- `delete_schedule`
