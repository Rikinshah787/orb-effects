# Orb event monitor

Connect to a server-sent events endpoint using the Event stream URL field.
The endpoint must allow the monitor origin through CORS when hosted elsewhere.
Use standard SSE `data` messages containing JSON:

```text
data: {"state":"tool_calling","label":"Searching documents","detail":"Reading 3 files"}

data: {"state":"done","label":"Answer ready"}

```

For an agent running in the same page, dispatch:

```js
window.dispatchEvent(new CustomEvent("orb:event", {
  detail: { state: "blocked", label: "Search failed", detail: "Retry the document service." }
}));
```

States: thinking, reading, searching, tool_calling, streaming, waiting,
blocked, done. Optional input, output, priority values range from 0 to 1.
Optional timestamp is a date string. Text is rendered as text, never HTML.

Import accepts a JSON array of up to 1,000 events under 2 MB. Export downloads
the retained history. History stays in memory, retains the latest 1,000 events,
and resets on refresh. The visible history shows the latest 50 events.
Blocked events are counted, not inferred failures or a risk score.
Last received measures time since receipt, including imported and preview events.
State buttons are manual previews and also enter the history.
No AI service is included; live operation requires your own SSE endpoint.
