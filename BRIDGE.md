# Orb Bridge

Orb Bridge is a tiny local event server for connecting coding agents and CLI
workflows to Orb Effects in real time.

## Start the Bridge

```bash
npm run bridge
```

Connect Orb to:

```text
http://localhost:3000/events
```

If port `3000` is busy:

```bash
$env:ORB_PORT=3001; npm run bridge
```

## Wrap Any Command

```bash
node bridge/orb-bridge.js npm test
node bridge/orb-bridge.js claude
node bridge/orb-bridge.js codex
```

The bridge publishes:

- `tool_calling` when the command starts
- `streaming` when stdout produces output
- `blocked` when stderr produces output or the command fails
- `done` when the command exits successfully

## Send Custom Events

Any local tool, editor extension, or agent can publish JSON:

```bash
curl -X POST http://localhost:3000/event \
  -H "Content-Type: application/json" \
  -d "{\"state\":\"reading\",\"label\":\"Reading files\",\"detail\":\"Scanning src/\"}"
```

Supported states:

`thinking`, `reading`, `searching`, `tool_calling`, `streaming`, `waiting`,
`blocked`, `done`

## Claude Code, Cursor, Codex

The bridge works best in two modes:

- Wrap the CLI command if the agent runs in a terminal.
- POST structured events from hooks, extensions, scripts, or wrappers.

Cursor does not expose every internal action directly, so the best path there is
a small extension or workflow wrapper that POSTs events to `/event`.
