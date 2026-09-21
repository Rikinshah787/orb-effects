#!/usr/bin/env node
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const PORT = Number(process.env.ORB_PORT || 3000);
const clients = new Set();
const recent = [];

const states = new Set(["thinking", "reading", "searching", "tool_calling", "streaming", "waiting", "blocked", "done"]);

function eventFrom(value) {
  const event = {
    state: states.has(value.state) ? value.state : "thinking",
    label: typeof value.label === "string" ? value.label.slice(0, 2000) : "Agent event",
    detail: typeof value.detail === "string" ? value.detail.slice(0, 2000) : "",
    input: clamp(value.input ?? 0.4),
    output: clamp(value.output ?? 0.2),
    priority: clamp(value.priority ?? 0.5),
    timestamp: new Date().toISOString()
  };
  return event;
}

function clamp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function publish(value) {
  const event = eventFrom(value);
  recent.push(event);
  recent.splice(0, Math.max(0, recent.length - 100));
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const response of clients) response.write(line);
  return event;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error("Body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/events") {
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream"
    });
    clients.add(response);
    for (const event of recent) response.write(`data: ${JSON.stringify(event)}\n\n`);
    request.on("close", () => clients.delete(response));
    return;
  }

  if (request.method === "POST" && request.url === "/event") {
    try {
      const event = publish(JSON.parse(await readBody(request)));
      response.writeHead(202, { "Content-Type": "application/json" });
      response.end(JSON.stringify(event));
    } catch (error) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Orb Bridge\nGET /events for Orb\nPOST /event to publish JSON\n");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try ORB_PORT=3001 npm run bridge.`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`Orb Bridge events: http://localhost:${PORT}/events`);
  runCommand(process.argv.slice(2));
});

function runCommand(args) {
  if (!args.length) {
    publish({
      state: "waiting",
      label: "Bridge ready",
      detail: "Connect Orb to this event stream or POST events to /event.",
      input: 0.12,
      output: 0.12,
      priority: 0.5
    });
    return;
  }

  const command = args[0];
  const child = spawn(command, args.slice(1), { shell: true, stdio: ["inherit", "pipe", "pipe"] });
  publish({
    state: "tool_calling",
    label: `Running ${command}`,
    detail: args.join(" "),
    input: 0.35,
    output: 0.35,
    priority: 0.7
  });

  child.stdout.on("data", (chunk) => handleOutput("streaming", chunk));
  child.stderr.on("data", (chunk) => handleOutput("blocked", chunk));
  child.on("error", (error) => {
    publish({ state: "blocked", label: "Command failed", detail: error.message, priority: 1 });
  });
  child.on("exit", (code) => {
    publish({
      state: code === 0 ? "done" : "blocked",
      label: code === 0 ? "Command complete" : `Command exited ${code}`,
      detail: args.join(" "),
      input: 0.05,
      output: code === 0 ? 0.7 : 0.12,
      priority: code === 0 ? 0.2 : 1
    });
  });
}

function handleOutput(state, chunk) {
  const text = chunk.toString().trim().split(/\r?\n/).slice(-2).join(" ").slice(0, 260);
  if (!text) return;
  process[state === "blocked" ? "stderr" : "stdout"].write(chunk);
  publish({
    state,
    label: state === "blocked" ? "Agent warning" : "Agent output",
    detail: text,
    input: 0.2,
    output: 0.78,
    priority: state === "blocked" ? 0.9 : 0.45
  });
}
