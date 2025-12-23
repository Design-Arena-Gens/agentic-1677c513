const canvas = document.getElementById('background-canvas');
const ctx = canvas.getContext('2d');

const config = {
  particleCount: 92,
  particleSize: { min: 1.2, max: 2.8 },
  speed: { min: 0.12, max: 0.45 },
  connectionDistance: 160,
  mouseConnectionDistance: 220,
  background: 'rgba(3, 3, 3, 0.9)',
  particleColor: 'rgba(255, 255, 255, 0.65)',
  lineColor: {
    rgb: '255, 255, 255',
    alpha: 0.24,
  },
};

const state = {
  particles: [],
  devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
};

const audio = new Audio('assets/audio/background.wav');
audio.loop = true;
audio.volume = 0.4;
audio.autoplay = true;
audio.preload = 'auto';

const muteToggle = document.querySelector('.mute-toggle');
const volumeSlider = document.querySelector('.volume-slider');
// Flag keeps the autoplay attempt persistent to respect platform policies.
let isInteractionBound = false;

const mouse = {
  x: 0,
  y: 0,
  active: false,
};

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    if (initial) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
    } else {
      // Respawn near the viewport edge for smoother flow.
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0:
          this.x = Math.random() * canvas.width;
          this.y = -this.size;
          break;
        case 1:
          this.x = canvas.width + this.size;
          this.y = Math.random() * canvas.height;
          break;
        case 2:
          this.x = Math.random() * canvas.width;
          this.y = canvas.height + this.size;
          break;
        default:
          this.x = -this.size;
          this.y = Math.random() * canvas.height;
      }
    }

    this.speed =
      config.speed.min +
      Math.random() * (config.speed.max - config.speed.min);
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.size =
      config.particleSize.min +
      Math.random() * (config.particleSize.max - config.particleSize.min);
    this.baseSize = this.size;
  }

  update() {
    this.x += this.vx * state.devicePixelRatio;
    this.y += this.vy * state.devicePixelRatio;

    // Softly push toward the mouse for subtle parallax energy.
    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < config.mouseConnectionDistance * state.devicePixelRatio) {
        const force = (config.mouseConnectionDistance - distance) * 0.00025;
        this.vx -= dx * force;
        this.vy -= dy * force;
      }
    }

    if (
      this.x < -this.size ||
      this.x > canvas.width + this.size ||
      this.y < -this.size ||
      this.y > canvas.height + this.size
    ) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = config.particleColor;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function resizeCanvas() {
  const prevWidth = canvas.width;
  const prevHeight = canvas.height;
  const prevDpr = state.devicePixelRatio || 1;
  const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

  state.devicePixelRatio = nextDpr;
  canvas.width = window.innerWidth * state.devicePixelRatio;
  canvas.height = window.innerHeight * state.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  const scaleX = prevWidth
    ? canvas.width / prevWidth
    : state.devicePixelRatio / prevDpr;
  const scaleY = prevHeight
    ? canvas.height / prevHeight
    : state.devicePixelRatio / prevDpr;

  state.particles.forEach((particle) => {
    particle.x *= scaleX;
    particle.y *= scaleY;
  });
}

function initParticles() {
  state.particles = Array.from(
    { length: config.particleCount },
    () => new Particle(),
  );
}

function drawConnections() {
  for (let i = 0; i < state.particles.length; i += 1) {
    const particle = state.particles[i];

    for (let j = i + 1; j < state.particles.length; j += 1) {
      const other = state.particles[j];
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.hypot(dx, dy);
      const maxDistance = config.connectionDistance * state.devicePixelRatio;

      if (distance < maxDistance) {
        const opacity = 1 - distance / maxDistance;
        const alpha = (config.lineColor.alpha * opacity).toFixed(3);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${config.lineColor.rgb}, ${alpha})`;
        ctx.lineWidth = opacity * 0.8;
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      }
    }

    if (mouse.active) {
      const dx = particle.x - mouse.x;
      const dy = particle.y - mouse.y;
      const distance = Math.hypot(dx, dy);
      const maxDistance =
        config.mouseConnectionDistance * state.devicePixelRatio;
      if (distance < maxDistance) {
        const opacity = 1 - distance / maxDistance;
        const alpha = (0.4 * opacity).toFixed(3);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${config.lineColor.rgb}, ${alpha})`;
        ctx.lineWidth = opacity * 1.2;
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });

  drawConnections();
  window.requestAnimationFrame(animate);
}

function attemptAutoplay() {
  audio
    .play()
    .then(() => {
      audio.muted = false;
    })
    .catch(() => {
      // Some platforms require a gesture; binding once keeps UX minimal.
      if (!isInteractionBound) {
        const resume = () => {
          audio.play().finally(() => {
            document.removeEventListener('pointerdown', resume);
            document.removeEventListener('keydown', resume);
          });
        };
        document.addEventListener('pointerdown', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
        isInteractionBound = true;
      }
    });
}

muteToggle.addEventListener('click', () => {
  audio.muted = !audio.muted;
  muteToggle.classList.toggle('is-muted', audio.muted);

  if (!audio.muted) {
    attemptAutoplay();
  }
});

volumeSlider.addEventListener('input', (event) => {
  const { value } = event.target;
  audio.volume = Number(value);
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (event.clientX - rect.left) * state.devicePixelRatio;
  mouse.y = (event.clientY - rect.top) * state.devicePixelRatio;
  mouse.active = true;
});

canvas.addEventListener('pointerleave', () => {
  mouse.active = false;
});

window.addEventListener('resize', () => {
  resizeCanvas();
});

// Initialize scene and audio system.
resizeCanvas();
initParticles();
animate();
attemptAutoplay();
