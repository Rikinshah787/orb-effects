# Orb Effects

Tiny animated status orbs for AI coding agents.

Most coding agents still feel like a black box while they read files, search,
call tools, wait for approval, run tests, or get stuck. Orb Effects turns that
invisible work into a small visual heartbeat that people can understand at a
glance.

## The CTA

Run your agent through Orb Bridge. Connect the page to
`http://localhost:3000/events`. Watch the orb change live.

## Why

Use Orb Effects when your product needs a status surface that is lighter than a
dashboard and more honest than a loading spinner.

- Show what an agent is doing right now.
- Make blocked or waiting states obvious.
- Stream live events over Server-Sent Events.
- Bridge CLI tools like Claude Code, Codex, Cursor wrappers, and test commands.
- Import and export event logs for demos, support, and debugging.
- Drop it into a page with no framework and no dependencies.

## Demo

```bash
python -m http.server 5173
```

Open `http://127.0.0.1:5173`.

## Connect a Coding Agent

Start the Orb UI:

```bash
npm run start
```

Start the bridge in another terminal:

```bash
npm run bridge
```

If port `3000` is busy on Windows PowerShell:

```bash
$env:ORB_PORT=3001; npm run bridge
```

Then connect the page to:

```text
http://localhost:3000/events
```

Wrap a command to stream live lifecycle events:

```bash
node bridge/orb-bridge.js npm test
node bridge/orb-bridge.js claude
node bridge/orb-bridge.js codex
```

Any editor extension, hook, or custom agent can also POST events:

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -d "{\"state\":\"reading\",\"label\":\"Reading files\",\"detail\":\"Scanning src/\"}"
```

See [BRIDGE.md](./BRIDGE.md) for details.

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
- `bridge/orb-bridge.js`: local bridge for CLI and agent events
- `index.html`: demo app
- `examples/sse-server.js`: local SSE demo server

## License

MIT
