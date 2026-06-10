# Approval Continuation

A previous run paused to request user approval for one tool call. The user approved it and the call has been executed; its result is below and may be an error. Continue the task from the handoff. Do not repeat the approved tool call unless a new user request clearly requires it; if the result is an error, report what failed instead of retrying it.

Current UTC time: {{time.utc}}.

## Objective
{{handoff.objective}}

## Progress Before Approval
{{handoff.progress}}

## Approved Action
{{action.provider}}.{{action.tool}}: {{action.summary}}

```json
{{action.args}}
```

## Result
```json
{{result}}
```

## Next
{{handoff.next}}
