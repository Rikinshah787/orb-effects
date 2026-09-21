import { createServer } from "node:http";

const events = [
  ["thinking", "Planning", "Choosing the next best action.", 0.42, 0.18, 0.68],
  ["reading", "Reading context", "Scanning project files and recent notes.", 0.64, 0.16, 0.52],
  ["searching", "Searching", "Looking for fresh evidence.", 0.58, 0.34, 0.62],
  ["tool_calling", "Calling tool", "Running an external action.", 0.36, 0.72, 0.76],
  ["streaming", "Streaming", "Writing the response.", 0.18, 0.86, 0.48],
  ["waiting", "Needs approval", "Waiting before sending the final action.", 0.12, 0.22, 0.88],
  ["done", "Complete", "The agent finished successfully.", 0.08, 0.44, 0.2]
];

createServer((request, response) => {
  if (request.url !== "/events") {
    response.writeHead(404);
    response.end("Use /events");
    return;
  }

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream"
  });

  let index = 0;
  const send = () => {
    const [state, label, detail, input, output, priority] = events[index % events.length];
    response.write(`data: ${JSON.stringify({ state, label, detail, input, output, priority, timestamp: new Date().toISOString() })}\n\n`);
    index += 1;
  };

  send();
  const timer = setInterval(send, 1800);
  request.on("close", () => clearInterval(timer));
}).listen(3000, () => {
  console.log("Orb event stream: http://localhost:3000/events");
});
