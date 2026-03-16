import { Graphics } from 'pixi.js';
import { getTimePhase } from './TimeOfDay.js';

interface Star {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	trail: { x: number; y: number }[];
}

export class ShootingStars {
	readonly gfx: Graphics;
	private star: Star | null = null;
	private timer: number;
	private screenW = 800;
	private screenH = 600;

	constructor() {
		this.gfx = new Graphics();
		this.timer = this.randomCooldown();
	}

	private randomCooldown(): number {
		return (90 + Math.random() * 90) * 60; // 90-180 seconds in frames
	}

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	update(dt: number) {
		if (getTimePhase() !== 'night') {
			this.gfx.clear();
			return;
		}

		this.timer -= dt;

		if (this.timer <= 0 && !this.star) {
			const goRight = Math.random() > 0.5;
			this.star = {
				x: goRight ? -10 : this.screenW + 10,
				y: Math.random() * this.screenH * 0.25,
				vx: (8 + Math.random() * 6) * (goRight ? 1 : -1),
				vy: 3 + Math.random() * 3,
				life: 0,
				maxLife: 15 + Math.random() * 10,
				trail: []
			};
			this.timer = this.randomCooldown();
		}

		this.gfx.clear();

		if (!this.star) return;

		const s = this.star;
		s.trail.push({ x: s.x, y: s.y });
		if (s.trail.length > 6) s.trail.shift();

		s.x += s.vx * dt;
		s.y += s.vy * dt;
		s.life += dt;

		if (s.life >= s.maxLife || s.x < -50 || s.x > this.screenW + 50 || s.y > this.screenH) {
			this.star = null;
			return;
		}

		// Draw trail
		const len = s.trail.length;
		for (let i = 0; i < len - 1; i++) {
			const a = s.trail[i];
			const b = s.trail[i + 1];
			const alpha = ((i + 1) / len) * 0.6;
			this.gfx.moveTo(a.x, a.y);
			this.gfx.lineTo(b.x, b.y);
			this.gfx.stroke({ color: 0xffffff, alpha, width: 1 });
		}

		// Draw head
		this.gfx.circle(s.x, s.y, 1.5);
		this.gfx.fill({ color: 0xffffff, alpha: 0.9 });
	}

	destroy() {
		this.gfx.destroy();
	}
}
