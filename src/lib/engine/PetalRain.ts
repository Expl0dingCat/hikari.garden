import { Graphics } from 'pixi.js';
import type { FlowerSprite } from './FlowerSprite.js';

interface Petal {
	x: number;
	y: number;
	vy: number;
	vx: number;
	rotation: number;
	rotSpeed: number;
	size: number;
	color: number;
	alpha: number;
}

export class PetalRain {
	readonly gfx: Graphics;
	private petals: Petal[] = [];
	private active = false;
	private screenW = 800;
	private screenH = 600;

	constructor() {
		this.gfx = new Graphics();
	}

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	trigger(flowers: FlowerSprite[]) {
		this.petals = [];
		this.active = true;

		// Sample colors from visible flowers
		const colors: number[] = [];
		for (const f of flowers) {
			if (!f.isGrown) continue;
			for (const c of f.dna.petalColors) {
				const num = parseInt(c.slice(1), 16);
				if (!isNaN(num) && !colors.includes(num)) colors.push(num);
				if (colors.length >= 8) break;
			}
			if (colors.length >= 8) break;
		}
		// Fallback pastels if no flowers
		if (colors.length === 0) {
			colors.push(0xffb3ba, 0xbaffc9, 0xbae1ff, 0xffffba, 0xe8baff);
		}

		// Spawn petals
		for (let i = 0; i < 150; i++) {
			this.petals.push({
				x: Math.random() * this.screenW,
				y: -10 - Math.random() * 200,
				vy: 1.5 + Math.random() * 2,
				vx: (Math.random() - 0.5) * 0.5,
				rotation: Math.random() * Math.PI * 2,
				rotSpeed: (Math.random() - 0.5) * 0.06,
				size: 3 + Math.random() * 3,
				color: colors[Math.floor(Math.random() * colors.length)],
				alpha: 0.6 + Math.random() * 0.4
			});
		}
	}

	update(dt: number) {
		if (!this.active) return;

		const time = performance.now() / 1000;
		const windSway = Math.sin(time * 0.4) * 0.4;

		// Update petals — swap-remove
		let len = this.petals.length;
		for (let i = len - 1; i >= 0; i--) {
			const p = this.petals[i];
			p.x += (p.vx + windSway) * dt;
			p.y += p.vy * dt;
			p.rotation += p.rotSpeed * dt;

			if (p.y > this.screenH + 30) {
				this.petals[i] = this.petals[len - 1];
				len--;
			}
		}
		this.petals.length = len;

		if (len === 0) {
			this.active = false;
			this.gfx.clear();
			return;
		}

		// Draw petals
		this.gfx.clear();
		for (const p of this.petals) {
			const cos = Math.cos(p.rotation);
			const sin = Math.sin(p.rotation);
			const hw = p.size * 0.4;
			const hh = p.size * 0.7;

			// Draw a rotated diamond/petal shape
			this.gfx.moveTo(p.x + cos * 0 - sin * (-hh), p.y + sin * 0 + cos * (-hh));
			this.gfx.lineTo(p.x + cos * hw - sin * 0, p.y + sin * hw + cos * 0);
			this.gfx.lineTo(p.x + cos * 0 - sin * hh, p.y + sin * 0 + cos * hh);
			this.gfx.lineTo(p.x + cos * (-hw) - sin * 0, p.y + sin * (-hw) + cos * 0);
			this.gfx.closePath();
			this.gfx.fill({ color: p.color, alpha: p.alpha });
		}
	}

	destroy() {
		this.gfx.destroy();
	}
}
