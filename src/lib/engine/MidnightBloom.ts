import { Container, Graphics } from 'pixi.js';

interface Firefly {
	x: number;
	y: number;
	vx: number;
	vy: number;
	phase: number;
	size: number;
	fadeIn: number; // 0→1 fade-in progress
}

const MAX_FIREFLIES = 20;
const SPAWN_INTERVAL = 10; // frames between spawns

export class MidnightBloom {
	container: Container;
	private gfx: Graphics;
	private fireflies: Firefly[] = [];
	private triggered: boolean;
	private active = false;
	private spawnTimer = 0;
	private checkCounter = 0;
	private gardenBoundsX = 300;
	private gardenBoundsY = 200;
	private duration = 0; // 0 = infinite (midnight), >0 = frames remaining
	private fadeOut = 1; // 1 = fully visible, fades to 0

	constructor() {
		this.container = new Container();
		this.gfx = new Graphics();
		this.container.addChild(this.gfx);
		this.triggered = typeof window !== 'undefined' &&
			sessionStorage.getItem('midnight-bloom-triggered') === 'true';
	}

	/** Manually trigger with a duration in seconds (0 = permanent) */
	trigger(durationSeconds = 0) {
		this.active = true;
		this.fireflies = [];
		this.spawnTimer = 0;
		this.duration = durationSeconds > 0 ? durationSeconds * 60 : 0;
		this.fadeOut = 1;
	}

	update(dt: number) {
		// Auto-trigger at midnight (permanent fireflies)
		if (!this.triggered && !this.active) {
			this.checkCounter += dt;
			if (this.checkCounter >= 60) {
				this.checkCounter = 0;
				const now = new Date();
				if (now.getHours() === 0 && now.getMinutes() < 10) {
					this.triggered = true;
					this.trigger(10 * 60); // 10 minutes
					if (typeof window !== 'undefined') {
						sessionStorage.setItem('midnight-bloom-triggered', 'true');
					}
				}
			}
		}

		if (!this.active) {
			this.gfx.clear();
			return;
		}

		// Duration countdown (0 = infinite)
		if (this.duration > 0) {
			this.duration -= dt;
			if (this.duration <= 0) {
				// Start fading out
				this.duration = -1;
			}
		}
		if (this.duration === -1) {
			this.fadeOut -= 0.015 * dt;
			if (this.fadeOut <= 0) {
				this.active = false;
				this.fireflies = [];
				this.gfx.clear();
				return;
			}
		}

		const time = performance.now() / 1000;

		// Spawn fireflies gradually (don't spawn during fade-out)
		if (this.fireflies.length < MAX_FIREFLIES && this.fadeOut >= 1) {
			this.spawnTimer += dt;
			if (this.spawnTimer >= SPAWN_INTERVAL) {
				this.spawnTimer = 0;
				this.fireflies.push({
					x: (Math.random() - 0.5) * this.gardenBoundsX * 2,
					y: (Math.random() - 0.5) * this.gardenBoundsY * 2,
					vx: (Math.random() - 0.5) * 0.3,
					vy: (Math.random() - 0.5) * 0.3,
					phase: Math.random() * Math.PI * 2,
					size: 0.3 + Math.random() * 0.3,
					fadeIn: 0
				});
			}
		}

		// Update fireflies
		for (const f of this.fireflies) {
			if (f.fadeIn < 1) f.fadeIn = Math.min(1, f.fadeIn + 0.01 * dt);

			if (Math.random() < 0.02) {
				f.vx += (Math.random() - 0.5) * 0.2;
				f.vy += (Math.random() - 0.5) * 0.2;
			}
			f.vx *= 0.995;
			f.vy *= 0.995;

			f.x += f.vx * dt;
			f.y += f.vy * dt;

			const dist = Math.sqrt(f.x * f.x + f.y * f.y);
			if (dist > this.gardenBoundsX) {
				f.vx -= f.x * 0.0002;
				f.vy -= f.y * 0.0002;
			}
		}

		// Draw
		this.gfx.clear();
		for (const f of this.fireflies) {
			const pulse = 0.3 + 0.7 * Math.sin(time * 2 + f.phase);
			const alpha = f.fadeIn * pulse * this.fadeOut;

			// Outer glow
			this.gfx.circle(f.x, f.y, f.size * 5);
			this.gfx.fill({ color: 0xccff66, alpha: alpha * 0.04 });

			// Mid glow
			this.gfx.circle(f.x, f.y, f.size * 2.5);
			this.gfx.fill({ color: 0xddffaa, alpha: alpha * 0.1 });

			// Core
			this.gfx.circle(f.x, f.y, f.size);
			this.gfx.fill({ color: 0xeeffcc, alpha: alpha * 0.5 });
		}
	}

	setBounds(x: number, y: number) {
		this.gardenBoundsX = Math.max(x, 200);
		this.gardenBoundsY = Math.max(y, 150);
	}

	destroy() {
		this.gfx.destroy();
		this.container.destroy({ children: true });
	}
}
