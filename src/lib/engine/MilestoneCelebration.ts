import { Graphics } from 'pixi.js';

interface Confetto {
	x: number;
	y: number;
	vx: number;
	vy: number;
	rotation: number;
	rotSpeed: number;
	size: number;
	color: number;
	life: number;
}

const CONFETTI_COLORS = [
	0xff6b6b, 0xffd166, 0x06d6a0, 0x118ab2, 0xef476f,
	0xffa07a, 0x77dd77, 0x88ddff, 0xee88aa, 0xfff176,
];

const MILESTONES = [10, 25, 50, 100, 200, 365, 500, 1000];

/**
 * Celebrates milestone flower counts with a confetti burst.
 */
export class MilestoneCelebration {
	readonly gfx = new Graphics();
	private confetti: Confetto[] = [];
	private lastCount = 0;
	private screenW = 0;
	private screenH = 0;

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	/** Call when flower count changes. Returns milestone number if hit, null otherwise. */
	checkMilestone(count: number): number | null {
		// Skip the very first call (initial load) — only celebrate new additions
		if (this.lastCount === 0) {
			this.lastCount = count;
			return null;
		}

		if (count <= this.lastCount) {
			this.lastCount = count;
			return null;
		}

		let hit: number | null = null;
		for (const m of MILESTONES) {
			if (this.lastCount < m && count >= m) {
				hit = m;
			}
		}

		this.lastCount = count;

		if (hit !== null) {
			this.burst();
		}

		return hit;
	}

	private burst() {
		const cx = this.screenW / 2;
		const cy = this.screenH * 0.3;

		for (let i = 0; i < 80; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 3 + Math.random() * 6;
			this.confetti.push({
				x: cx + (Math.random() - 0.5) * 40,
				y: cy + (Math.random() - 0.5) * 20,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 3,
				rotation: Math.random() * Math.PI * 2,
				rotSpeed: (Math.random() - 0.5) * 0.3,
				size: 3 + Math.random() * 4,
				color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
				life: 80 + Math.random() * 40,
			});
		}
	}

	update(dt: number) {
		for (let i = this.confetti.length - 1; i >= 0; i--) {
			const c = this.confetti[i];
			c.x += c.vx * dt;
			c.y += c.vy * dt;
			c.vy += 0.12 * dt; // gravity
			c.vx *= 0.99;
			c.rotation += c.rotSpeed * dt;
			c.life -= dt;
			if (c.life <= 0) this.confetti.splice(i, 1);
		}

		this.gfx.clear();
		if (this.confetti.length === 0) return;

		for (const c of this.confetti) {
			const alpha = Math.min(1, c.life / 20);
			const cos = Math.cos(c.rotation);
			const sin = Math.sin(c.rotation);
			const hw = c.size / 2;
			const hh = c.size / 4;
			// Rotated rectangle as polygon
			const corners = [
				{ x: -hw, y: -hh }, { x: hw, y: -hh },
				{ x: hw, y: hh }, { x: -hw, y: hh }
			];
			const points: number[] = [];
			for (const corner of corners) {
				points.push(c.x + corner.x * cos - corner.y * sin);
				points.push(c.y + corner.x * sin + corner.y * cos);
			}
			this.gfx.poly(points);
			this.gfx.fill({ color: c.color, alpha });
		}
	}

	destroy() {
		this.confetti = [];
		this.gfx.destroy();
	}
}
