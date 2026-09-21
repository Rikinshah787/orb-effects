import { Orb } from "./orb.js";

const orb = new Orb("#aura");
const statusPill = document.querySelector("#statusPill");
const buttons = [...document.querySelectorAll(".state-button")];
const size = document.querySelector("#size");
const inputSignal = document.querySelector("#inputSignal");
const outputSignal = document.querySelector("#outputSignal");
const priority = document.querySelector("#priority");
const copySnippet = document.querySelector("#copySnippet");
const snippet = document.querySelector("#snippet");
const sizeValue = document.querySelector("#sizeValue");
const inputSignalValue = document.querySelector("#inputSignalValue");
const outputSignalValue = document.querySelector("#outputSignalValue");
const prioritySliderValue = document.querySelector("#prioritySliderValue");
const inputValue = document.querySelector("#inputValue");
const outputValue = document.querySelector("#outputValue");
const priorityValue = document.querySelector("#priorityValue");
const phaseTitle = document.querySelector("#phaseTitle");
const phaseDetail = document.querySelector("#phaseDetail");
const eventTrail = document.querySelector("#eventTrail");

const STATES = {
  thinking: {
    label: "Thinking",
    detail: "Choosing the next step.",
    input: 0.42,
    output: 0.18,
    priority: 0.68
  },
  reading: {
    label: "Reading context",
    detail: "Scanning docs, memory, and recent messages.",
    input: 0.64,
    output: 0.16,
    priority: 0.52
  },
  searching: {
    label: "Searching",
    detail: "Looking for fresh evidence before answering.",
    input: 0.58,
    output: 0.34,
    priority: 0.62
  },
  tool_calling: {
    label: "Calling a tool",
    detail: "Running an external action with observable progress.",
    input: 0.36,
    output: 0.72,
    priority: 0.76
  },
  streaming: {
    label: "Streaming output",
    detail: "The assistant is producing a response now.",
    input: 0.18,
    output: 0.86,
    priority: 0.48
  },
  waiting: {
    label: "Waiting on you",
    detail: "The agent needs approval or missing information.",
    input: 0.12,
    output: 0.22,
    priority: 0.88
  },
  blocked: {
    label: "Blocked",
    detail: "Something failed and needs attention.",
    input: 0.24,
    output: 0.1,
    priority: 1
  },
  done: {
    label: "Done",
    detail: "The task is complete.",
    input: 0.08,
    output: 0.44,
    priority: 0.2
  }
};

let currentSignal = { state: "thinking", ...STATES.thinking };

function renderSignal(stateName, event = {}) {
  const state = { ...STATES[stateName], ...event };
  currentSignal = { state: stateName, ...state };
  orb.setEvent(currentSignal);
  statusPill.textContent = stateName.replace("_", " ");
  phaseTitle.textContent = state.label;
  phaseDetail.textContent = state.detail;

  inputSignal.value = Math.round(state.input * 100);
  outputSignal.value = Math.round(state.output * 100);
  priority.value = Math.round(state.priority * 100);
  syncSignalLabels();
  buttons.forEach(button => button.classList.toggle("is-active", button.dataset.state === stateName));
}

function syncSignalLabels() {
  const input = Number(inputSignal.value);
  const output = Number(outputSignal.value);
  const priorityScore = Number(priority.value);
  currentSignal.input = input / 100;
  currentSignal.output = output / 100;
  currentSignal.priority = priorityScore / 100;
  inputSignalValue.textContent = `${input}%`;
  outputSignalValue.textContent = `${output}%`;
  prioritySliderValue.textContent = priorityScore;
  inputValue.textContent = `${input}%`;
  outputValue.textContent = `${output}%`;
  priorityValue.textContent = priorityScore;
}


buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextState = button.dataset.state;
    renderSignal(nextState);
    window.dispatchEvent(new CustomEvent("orb:event", { detail: { state: nextState, ...STATES[nextState], source: "Manual preview" } }));
    buttons.forEach((item) => item.classList.toggle("is-active", item === button));
  });
});

size.addEventListener("input", () => {
  orb.setSize(size.value);
  sizeValue.textContent = size.value;
});

inputSignal.addEventListener("input", () => {
  const value = Number(inputSignal.value);
  orb.setSignal({ input: value / 100 });
  syncSignalLabels();
});

outputSignal.addEventListener("input", () => {
  const value = Number(outputSignal.value);
  orb.setSignal({ output: value / 100 });
  syncSignalLabels();
});

priority.addEventListener("input", () => {
  const value = Number(priority.value);
  orb.setSignal({ priority: value / 100 });
  syncSignalLabels();
});

copySnippet.addEventListener("click", async () => {
  await navigator.clipboard.writeText(snippet.textContent.trim());
  copySnippet.textContent = "Copied";
  copySnippet.classList.add("is-copied");
  window.setTimeout(() => {
    copySnippet.textContent = "Copy Orb snippet";
    copySnippet.classList.remove("is-copied");
  }, 1300);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    orb.stop();
  } else {
    orb.start();
  }
});

renderSignal("thinking");

import { attachMonitor } from "./monitor.js";
attachMonitor((event) => renderSignal(event.state, event), eventTrail);
