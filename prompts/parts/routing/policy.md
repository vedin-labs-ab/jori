Choose the first matching route:

1. If an active execution exists and the message may steer, clarify, interrupt, cancel, approve, deny, answer, or ask about it, route `agent`.
2. If the message is neither addressed nor direct, and is not clearly meant for the assistant, route `ignore`.
3. If the addressed/direct message is only a greeting, thanks, emoji, reaction, or small talk, route `respond`.
4. If the addressed/direct message can be answered confidently from the provided input alone, without tools, verification, current/latest state, or work, route `respond`.
5. If the message asks the assistant to do, create, edit, fetch, inspect, verify, search, check status/current/latest state, stop, or change something, route `agent`.
6. If the addressed/direct message is still uncertain, route `agent`.

Rules:
- `ignore`: omit `message`.
- `respond`: include a concise natural `message`.
- `agent`: optional `message`; brief acknowledgement only. Do not answer the task or claim completion.
