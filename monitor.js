const states = new Set(["thinking", "reading", "searching", "tool_calling", "streaming", "waiting", "blocked", "done"]);

export function validateEvent(value) {
  if (!value || !states.has(value.state)) throw new Error("Each event needs a supported state.");
  const event = { state: value.state };
  for (const key of ["label", "detail", "source"]) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string") throw new Error(`${key} must be text.`);
      event[key] = value[key].slice(0, 2000);
    }
  }
  for (const key of ["input", "output", "priority"]) {
    if (value[key] !== undefined) {
      if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) throw new Error(`${key} must be between 0 and 1.`);
      event[key] = value[key];
    }
  }
  if (value.timestamp !== undefined && !Number.isFinite(Date.parse(value.timestamp))) throw new Error("Invalid timestamp.");
  event.timestamp = value.timestamp ? new Date(value.timestamp).toISOString() : new Date().toISOString();
  return event;
}

export function attachMonitor(render, trail) {
  const $ = (id) => document.getElementById(id);
  let history = [];
  let stream;
  let lastReceived = 0;
  const message = (text) => { $("connectionStatus").textContent = text; };
  function accept(value, source) {
    const event = validateEvent({ ...value, source: source || value.source || "App event" });
    history.push(event);
    history = history.slice(-1000);
    lastReceived = Date.now();
    render(event);
    trail.replaceChildren(...history.slice(-50).reverse().map((item) => {
      const row = document.createElement("li");
      const time = document.createElement("span");
      const text = document.createElement("strong");
      time.textContent = new Date(item.timestamp).toLocaleTimeString();
      text.textContent = `${item.label || item.state}: ${item.detail || ""}`;
      row.title = item.source;
      row.append(time, text);
      return row;
    }));
    $("eventCount").textContent = String(history.length);
    $("failureCount").textContent = String(history.filter(item => item.state === "blocked").length);
    $("exportLog").disabled = false;
  }
  window.addEventListener("orb:event", ({ detail }) => {
    try { accept(detail); } catch (error) { message(error.message); }
  });
  $("connectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (stream) { stream.close(); stream = null; $("connect").textContent = "Connect"; message("Disconnected"); return; }
    try {
      const url = new URL($("endpoint").value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an HTTP or HTTPS event stream URL.");
      stream = new EventSource(url.href);
      $("connect").textContent = "Disconnect";
      message("Connecting...");
      stream.onopen = () => message("Live connection");
      stream.onerror = () => message("Connection interrupted. Retrying...");
      stream.onmessage = ({ data }) => {
        try { accept(JSON.parse(data), "Live stream"); } catch (error) { message(`Invalid event: ${error.message}`); }
      };
    } catch (error) { message(error.message); }
  });
  $("importLog").addEventListener("change", async ({ target }) => {
    try {
      const file = target.files[0];
      if (!file) return;
      if (file.size > 2000000) throw new Error("Choose a JSON log under 2 MB.");
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) || !data.length || data.length > 1000) throw new Error("Expected an array of 1 to 1,000 events.");
      const events = data.map(validateEvent);
      events.forEach(event => accept(event, "Imported log"));
      message(`Imported ${events.length} events`);
    } catch (error) { message(error.message); }
    target.value = "";
  });
  $("exportLog").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(history, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orb-events.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  setInterval(() => {
    $("eventAge").textContent = lastReceived ? `${Math.floor((Date.now() - lastReceived) / 1000)}s ago` : "No events";
  }, 1000);
  trail.replaceChildren();
}
