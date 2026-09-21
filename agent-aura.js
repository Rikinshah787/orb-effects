const PALETTES = {
  idle: ["#697386", "#f6f7fb", "#9ea7b8"],
  thinking: ["#58d5c9", "#f6f7fb", "#8fb4ff"],
  reading: ["#8fb4ff", "#b7f0ff", "#58d5c9"],
  searching: ["#8fb4ff", "#b7f0ff", "#ffce6b"],
  tool_calling: ["#ffce6b", "#58d5c9", "#f6f7fb"],
  streaming: ["#75f28f", "#58d5c9", "#f6f7fb"],
  waiting: ["#ffce6b", "#f6f7fb", "#9ea7b8"],
  blocked: ["#ff6f91", "#ffce6b", "#f6f7fb"],
  done: ["#75f28f", "#f6f7fb", "#58d5c9"]
};

const STATE_CONFIG = {
  idle: { pulse: 0.08, drift: 0.3, orbit: 0.22, wobble: 0.02 },
  thinking: { pulse: 0.34, drift: 0.7, orbit: 0.82, wobble: 0.12 },
  reading: { pulse: 0.16, drift: 0.64, orbit: 0.96, wobble: 0.08 },
  searching: { pulse: 0.22, drift: 1.1, orbit: 1.32, wobble: 0.2 },
  tool_calling: { pulse: 0.28, drift: 1.28, orbit: 1.58, wobble: 0.1 },
  streaming: { pulse: 0.2, drift: 0.9, orbit: 1.72, wobble: 0.06 },
  waiting: { pulse: 0.1, drift: 0.36, orbit: 0.36, wobble: 0.03 },
  blocked: { pulse: 0.48, drift: 0.38, orbit: 0.52, wobble: 0.42 },
  done: { pulse: 0.12, drift: 0.5, orbit: 0.44, wobble: 0.03 }
};

export class Orb {
  constructor(target, options = {}) {
    this.canvas = typeof target === "string" ? document.querySelector(target) : target;
    if (!this.canvas) {
      throw new Error("AgentAura target canvas was not found.");
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.state = options.state || "thinking";
    this.size = options.size || 420;
    this.density = options.density || 132;
    this.speed = options.speed || 0.92;
    this.input = options.input ?? 0.42;
    this.output = options.output ?? 0.18;
    this.priority = options.priority ?? 0.68;
    this.label = options.label || "Thinking";
    this.detail = options.detail || "Choosing the next step.";
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.running = false;
    this.particles = [];

    this.setSize(this.size);
    this.setDensity(this.density);
    this.start();
  }

  setState(state) {
    if (!STATE_CONFIG[state]) return;
    this.state = state;
  }

  setSignal(signal) {
    if (signal.state) this.setState(signal.state);
    if (signal.label) this.label = signal.label;
    if (signal.detail) this.detail = signal.detail;
    if (Number.isFinite(signal.input)) this.input = Math.max(0, Math.min(1, signal.input));
    if (Number.isFinite(signal.output)) this.output = Math.max(0, Math.min(1, signal.output));
    if (Number.isFinite(signal.priority)) this.priority = Math.max(0, Math.min(1, signal.priority));
  }

  setEvent(event) {
    this.setSignal({
      state: event.state,
      label: event.label,
      detail: event.detail,
      input: event.input,
      output: event.output,
      priority: event.priority
    });
  }

  setSize(size) {
    this.size = Number(size);
    this.canvas.width = this.size * this.pixelRatio;
    this.canvas.height = this.size * this.pixelRatio;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  setDensity(density) {
    this.density = Number(density);
    this.particles = Array.from({ length: this.density }, (_, index) => ({
      seed: index * 19.17,
      lane: 0.32 + ((index % 7) / 7) * 0.38,
      radius: 1.4 + ((index * 3) % 8) / 5,
      offset: (index / this.density) * Math.PI * 2
    }));
  }

  setSpeed(speed) {
    this.speed = Number(speed);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.frame = requestAnimationFrame((time) => this.draw(time));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  draw(time) {
    const t = this.prefersReducedMotion.matches ? 900 : time * 0.001 * this.speed;
    const center = this.size / 2;
    const maxRadius = this.size * 0.36;
    const config = STATE_CONFIG[this.state];
    const palette = PALETTES[this.state];

    this.ctx.clearRect(0, 0, this.size, this.size);
    this.drawMembrane(center, maxRadius, palette, t, config);
    this.drawGlow(center, maxRadius, palette, t, config);

    for (const particle of this.particles) {
      const wave = Math.sin(t * config.drift + particle.seed) * config.wobble;
      const angle = particle.offset + t * config.orbit * (0.16 + particle.lane) + wave;
      const pulse = 1 + Math.sin(t * 2.2 + particle.seed) * config.pulse;
      const signalPush = 1 + this.output * 0.34 + this.priority * 0.12;
      const laneRadius = maxRadius * particle.lane * pulse * signalPush;
      const x = center + Math.cos(angle) * laneRadius;
      const y = center + Math.sin(angle * 1.12) * laneRadius * (0.72 + this.input * 0.18);
      const color = palette[Math.floor(particle.seed) % palette.length];
      const opacity = 0.28 + particle.lane * 0.48 + this.priority * 0.22;

      this.ctx.beginPath();
      this.ctx.fillStyle = this.withAlpha(color, opacity);
      this.ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (this.state === "done") this.drawCheck(center, maxRadius);
    this.drawSignalBands(center, maxRadius, palette, t);
    if (this.running) this.frame = requestAnimationFrame((next) => this.draw(next));
  }

  drawMembrane(center, radius, palette, t, config) {
    const points = 96;
    this.ctx.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const ripple =
        Math.sin(angle * 4 + t * config.orbit) * (7 + this.input * 14) +
        Math.cos(angle * 7 - t * 1.4) * (3 + this.output * 10);
      const r = radius * (0.88 + this.priority * 0.18) + ripple;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      if (index === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = this.withAlpha(palette[0], 0.26 + this.priority * 0.28);
    this.ctx.lineWidth = Math.max(1.5, this.size * 0.006);
    this.ctx.stroke();
  }

  drawGlow(center, radius, palette, t, config) {
    const breathing = 1 + Math.sin(t * 1.6) * config.pulse * 0.24;
    const gradient = this.ctx.createRadialGradient(center, center, 0, center, center, radius * 1.32);
    gradient.addColorStop(0, this.withAlpha(palette[0], 0.22));
    gradient.addColorStop(0.48, this.withAlpha(palette[1], 0.08));
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(center, center, radius * 1.28 * breathing, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawSignalBands(center, radius, palette, t) {
    const start = -Math.PI / 2;
    const bands = [
      { value: this.input, color: palette[0], offset: 0 },
      { value: this.output, color: palette[1], offset: 10 },
      { value: this.priority, color: palette[2] || palette[0], offset: 20 }
    ];

    for (const band of bands) {
      const r = radius + band.offset + 22;
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.withAlpha(band.color, 0.72);
      this.ctx.lineWidth = Math.max(2, this.size * 0.008);
      this.ctx.lineCap = "round";
      this.ctx.arc(center, center, r, start + Math.sin(t + band.offset) * 0.04, start + Math.PI * 2 * band.value, false);
      this.ctx.stroke();
    }
  }

  drawCheck(center, radius) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "rgba(117, 242, 143, 0.86)";
    this.ctx.lineWidth = Math.max(4, this.size * 0.015);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.moveTo(center - radius * 0.34, center + radius * 0.02);
    this.ctx.lineTo(center - radius * 0.08, center + radius * 0.26);
    this.ctx.lineTo(center + radius * 0.38, center - radius * 0.28);
    this.ctx.stroke();
  }

  withAlpha(hex, alpha) {
    const value = hex.replace("#", "");
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}

export { Orb as AgentAura };
