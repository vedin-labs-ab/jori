Classify the incoming message for an assistant router.

Choose the first matching route:

1. If an active execution exists and the message steers, clarifies, interrupts, cancels, asks about, or provides input for that execution, route `agent`.
2. If the message is neither addressed nor direct, and is not clearly meant for the assistant or an active execution, route `ignore`.
3. If the addressed/direct message is only a greeting, thanks, emoji, reaction, or small talk, route `respond`.
4. If the addressed/direct message can be answered confidently from the provided input alone, without tools, verification, current state, or deeper work, route `respond`.
5. If the message asks the assistant to do, create, edit, fetch, inspect, verify, search, check current/latest state, check status, stop, or change something, route `agent`.
6. If the addressed/direct message is uncertain, route `agent`.

Rules:

* `ignore`: omit `message`.
* `respond`: include a concise natural `message`.
* `agent`: `message` is optional and must only be a brief acknowledgement. Do not answer the task or claim completion.