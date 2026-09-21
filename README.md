# Orb Effects

Tiny animated status orbs for AI agents.

Most agent apps still show a spinner while the model is reading, searching,
calling tools, waiting for approval, or stuck. Orb Effects turns that invisible
work into a small visual heartbeat that people can understand at a glance.

## Why

Use Orb Effects when your product needs a status surface that is lighter than a
dashboard and more honest than a loading spinner.

- Show what an agent is doing right now.
- Make blocked or waiting states obvious.
- Stream live events over Server-Sent Events.
- Import and export event logs for demos, support, and debugging.
- Drop it into a page with no framework and no dependencies.

## Demo

```bash
python -m http.server 5173
```

Open `http://127.0.0.1:5173`.

## Install

Copy `orb.js` and `agent-aura.js` into your app, then add a canvas:

```html
<canvas id="orb"></canvas>
<script type="module">
  import { Orb } from "./orb.js";

  const orb = new Orb("#orb", {
    state: "tool_calling",
    input: 0.42,
    output: 0.18,
    priority: 0.68
  });

  orb.setEvent({
    state: "waiting",
    label: "Needs approval",
    detail: "Draft is ready before anything is sent.",
    priority: 0.91
  });
</script>
```

## Agent States

- `thinking`: choosing the next step
- `reading`: scanning context
- `searching`: looking up fresh evidence
- `tool_calling`: using an external tool
- `streaming`: producing an answer
- `waiting`: needs user input or approval
- `blocked`: failed or needs attention
- `done`: complete

## Event Shape

```json
{
  "state": "tool_calling",
  "label": "Running search",
  "detail": "Checking fresh sources before answering.",
  "input": 0.58,
  "output": 0.34,
  "priority": 0.62,
  "timestamp": "2026-09-21T07:00:00.000Z"
}
```

`input`, `output`, and `priority` are numbers from `0` to `1`.

## Live Stream

The monitor UI can connect to any HTTP or HTTPS Server-Sent Events endpoint that
sends JSON events:

```text
data: {"state":"searching","label":"Searching","detail":"Looking up sources."}

```

See [MONITOR.md](./MONITOR.md) for the full monitor contract.

## Project Files

- `orb.js`: public export
- `agent-aura.js`: canvas renderer
- `monitor.js`: live event monitor, validation, import/export
- `index.html`: demo app
- `examples/sse-server.js`: local SSE demo server

## License

MIT
