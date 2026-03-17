import { Graphics } from 'pixi.js';

interface Star {
	x: number; // 0-1 normalized screen position
	y: number;
	phase: number;
	brightness: number; // base brightness 0.1-0.4
	size: number; // 1 or 2
}

export class StarField {
	private gfx: Graphics;
	private stars: Star[] = [];
	private screenW = 0;
	private screenH = 0;
	private time = 0;

	constructor() {
		this.gfx = new Graphics();
		// Generate 40 stars with seeded positions
		for (let i = 0; i < 40; i++) {
			this.stars.push({
				x: pseudoRandom(i * 137 + 29),
				y: pseudoRandom(i * 251 + 83) * 0.6, // upper 60% of screen
				phase: pseudoRandom(i * 397 + 51) * Math.PI * 2,
				brightness: 0.1 + pseudoRandom(i * 173 + 67) * 0.3,
				size: pseudoRandom(i * 311 + 41) > 0.8 ? 2 : 1,
			});
		}
	}

	getContainer() {
		return this.gfx;
	}

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	update(dt: number, nightFactor: number) {
		this.time += dt;
		this.gfx.clear();

		if (nightFactor < 0.01) {
			this.gfx.visible = false;
			return;
		}
		this.gfx.visible = true;

		for (const star of this.stars) {
			const twinkle = 0.5 + 0.5 * Math.sin(this.time * 0.03 + star.phase);
			const alpha = star.brightness * twinkle * nightFactor;
			if (alpha < 0.01) continue;

			const sx = star.x * this.screenW;
			const sy = star.y * this.screenH;

			this.gfx.rect(sx, sy, star.size, star.size);
			this.gfx.fill({ color: 0xffffff, alpha });
		}
	}
}

/** Simple hash-based pseudo-random 0-1 from an integer seed */
function pseudoRandom(seed: number): number {
	let x = Math.sin(seed * 9301 + 49297) * 233280;
	return x - Math.floor(x);
}
