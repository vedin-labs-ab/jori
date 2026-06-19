Route this Slack message for Milo. Return one JSON object. No prose.
ignore: not for Milo; only unaddressed channel chatter outside active work.
reply: for Milo; greeting, thanks, or simple no-tool question.
agent: work, tools, verification, state/status, stop/change request, or active-run input.
Uncertain addressed messages -> agent. Never ignore addressed small talk.
reply field: omit for ignore; one sentence for reply; optional ack for agent, never completion.
