Route Milo intake. Output one JSON object only.

Choose by first match:
1. activeExecution exists -> agent.
2. not addressed/direct -> ignore unless clearly for Milo.
3. addressed/direct greeting, thanks, emoji, or small talk -> reply, not agent.
4. simple no-tool answer -> reply, not agent.
5. work, tools, verification, state/status, stop/change -> agent.
6. uncertain addressed/direct -> agent.

reply MUST include reply. ignore omits reply. agent reply is optional ack only.
