# Agent Runtime Architecture

Milo uses three planes with strict ownership.

- Convex is the product and control plane. It owns tenants, users,
  integrations, ingress, conversations, runs, executions, run events,
  approvals, tool policy, sandbox metadata, artifact/file metadata, and
  realtime UI state.
- Trigger.dev is the long-running execution plane. It owns queues, retries,
  task logs, subagent fan-out, pause/resume, and the model/tool loop.
- E2B is the sandbox execution plane. It owns shell commands, filesystem work,
  builds, tests, artifact validation, and any command that can exceed Convex
  action limits.

Convex must not run model loops, shell commands, or sandbox work. Trigger tasks
call Convex through typed functions for durable state changes, and only use HTTP
Actions for raw webhook-style endpoints such as brokered MCP or file uploads.

## Run Flow

1. Convex creates a `runs` record, creates the initial `executions` record, and
   writes a `runtimeOutbox` item for the Trigger operation.
2. A Convex action drains the outbox with `TRIGGER_DEV_API_KEY`, triggering the
   `milo-agent-run` task with an idempotency key derived from the outbox item.
3. Trigger loads the run from Convex, records lifecycle events with stable
   event keys, and starts the model loop.
4. Product and integration tools call Convex broker functions. Sandbox tools
   lazily create or reconnect an E2B sandbox, persist its ID in Convex, then run
   commands from Trigger.
5. Milo artifact publish tools validate and build source from the E2B
   workspace inside Trigger before calling Convex with the publish payload.
   `save_file` reads bytes from E2B and uses the raw `/milo/files` upload
   endpoint with the Milo worker secret; Convex stores only file metadata and
   object storage references.
6. Approval tools create approval state in Convex, store the Trigger waitpoint
   token on the approval, and suspend the task with `wait.forToken`.
7. Approval decisions update Convex first, then write a resume outbox item that
   completes the Trigger waitpoint token. Convex polling is only a fallback for
   environments where waitpoints are unavailable.
8. Subagent tools create child runs in Convex with `parentRunId` and
   `rootRunId`, then enqueue child Trigger tasks through the same outbox.
9. Slack ingress acknowledges immediately after Convex records the message and
   run intent. Convex stores one `runtimeSlackStatuses` record per Slack run and
   scheduled actions post or update the visible Slack working/completed/failed
   status from that Convex-backed state.
10. Trigger records final messages, errors, sandbox cleanup, and completion
    state back to Convex. Convex realtime queries and Slack status updates read
    only Convex state.

## Idempotency

Trigger-to-Convex callbacks use stable event keys:

- `runId:source:sequence:type` for lifecycle and final messages.
- `runId:source:sequence:type:toolCallId:attempt` for tool events.
- E2B sandbox lifecycle is keyed by sandbox ID in `runtimeSandboxes`.

Convex-to-Trigger operations use `runtimeOutbox` records. Mutations create or
update durable intent, and a separate action performs external Trigger calls
with retries. External calls are never assumed to be atomic with Convex
transactions.

## Runtime Interfaces

The model runtime is adapter based. The first implementation uses Vercel AI SDK
with the OpenRouter provider behind a small interface that accepts messages and
tool definitions and returns final messages or tool calls. The default target is
`z-ai/glm-5.2` with `MILO_OPENROUTER_REASONING_EFFORT=xhigh`, which maps GLM 5.2
to max reasoning. The interface is intentionally narrow so the provider can
change later without changing Convex state or Trigger task ownership.

The sandbox runtime is adapter based. The first implementation uses E2B behind a
small interface for lazy sandbox creation/reconnect, command execution, and
cleanup. E2B sandbox IDs are persisted on executions so Trigger retries can
reconnect or clean up correctly.
