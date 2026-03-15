import { Container, Graphics } from 'pixi.js';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	color: number;
	alpha: number;
	graphic: Graphics;
}

export class ParticleSystem {
	container: Container;
	private particles: Particle[] = [];
	private spawnTimer = 0;
	private bounds = { width: 800, height: 600 };

	color = 0xc8e6c9;
	spawnRate = 0.3; // particles per frame
	maxParticles = 60;
	alpha = 0.3;

	constructor() {
		this.container = new Container();
	}

	setBounds(width: number, height: number) {
		this.bounds = { width, height };
	}

	private spawn() {
		const g = new Graphics();
		const size = 1 + Math.random() * 2;
		g.circle(0, 0, size);
		g.fill({ color: this.color, alpha: this.alpha });

		const particle: Particle = {
			x: (Math.random() - 0.5) * this.bounds.width * 2,
			y: (Math.random() - 0.5) * this.bounds.height * 2,
			vx: (Math.random() - 0.5) * 0.3,
			vy: -0.1 - Math.random() * 0.3,
			life: 0,
			maxLife: 300 + Math.random() * 400,
			size,
			color: this.color,
			alpha: this.alpha,
			graphic: g
		};

		g.position.set(particle.x, particle.y);
		this.container.addChild(g);
		this.particles.push(particle);
	}

	update(dt: number) {
		// Spawn
		this.spawnTimer += this.spawnRate * dt;
		while (this.spawnTimer >= 1 && this.particles.length < this.maxParticles) {
			this.spawn();
			this.spawnTimer--;
		}

		// Update
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life += dt;

			// Gentle wind
			p.x += p.vx * dt + Math.sin(performance.now() / 3000 + p.y * 0.01) * 0.1;
			p.y += p.vy * dt;

			// Fade in and out
			const lifeRatio = p.life / p.maxLife;
			if (lifeRatio < 0.1) {
				p.graphic.alpha = lifeRatio / 0.1;
			} else if (lifeRatio > 0.8) {
				p.graphic.alpha = (1 - lifeRatio) / 0.2;
			} else {
				p.graphic.alpha = 1;
			}

			p.graphic.position.set(p.x, p.y);

			// Remove dead particles
			if (p.life >= p.maxLife) {
				this.container.removeChild(p.graphic);
				p.graphic.destroy();
				this.particles.splice(i, 1);
			}
		}
	}

	setTheme(color: number, alpha: number) {
		this.color = color;
		this.alpha = alpha;
	}

	destroy() {
		for (const p of this.particles) {
			p.graphic.destroy();
		}
		this.particles = [];
		this.container.destroy({ children: true });
	}
}
