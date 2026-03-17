import { Graphics } from 'pixi.js';
import type { FlowerSprite } from './FlowerSprite.js';
import { getSolarTimes } from './SolarTimes.js';

/**
 * Morning dew drops on flowers during dawn (5-8am).
 * Tiny shimmering dots on petals that fade as morning progresses.
 */
export class DewDrops {
	private gfx: Graphics;
	private time = 0;

	constructor() {
		this.gfx = new Graphics();
	}

	private forceTimer = 0;

	getContainer() {
		return this.gfx;
	}

	/** Force dew visible for ~10 seconds (debug) */
	forceDew() {
		this.forceTimer = 600; // 10 seconds at 60fps
	}

	update(dt: number, flowers: FlowerSprite[]) {
		this.time += dt;
		this.gfx.clear();

		if (this.forceTimer > 0) this.forceTimer -= dt;

		const h = new Date().getHours();
		const m = new Date().getMinutes();
		const fh = h + m / 60;
		const forced = this.forceTimer > 0;

		// Only active during dawn: sunrise-0.5 to sunrise+2.5 (or forced)
		const solar = getSolarTimes();
		const dewStart = solar.sunrise - 0.5;
		const dewEnd = solar.sunrise + 2.5;
		if (!forced && (fh < dewStart || fh >= dewEnd)) {
			this.gfx.visible = false;
			return;
		}
		this.gfx.visible = true;

		// Alpha fades from 1.0 at dewStart to 0.0 at dewEnd
		const dewAlpha = forced ? Math.min(1, this.forceTimer / 60) : Math.max(0, 1 - (fh - dewStart) / (dewEnd - dewStart));

		for (const flower of flowers) {
			if (!flower.isGrown) continue;

			const cx = flower.container.position.x;
			const cy = flower.container.position.y;
			const headY = cy - flower.flowerHeight * 0.7;
			const seed = flower.entry.flowerSeed;

			// 3-5 dew drops per flower, deterministically placed
			const count = 3 + (seed % 3);
			for (let i = 0; i < count; i++) {
				const hash = pseudoRandom(seed * 31 + i * 137);
				const hash2 = pseudoRandom(seed * 71 + i * 251);

				const offsetX = (hash - 0.5) * 20;
				const offsetY = (hash2 - 0.5) * 14;

				// Shimmer pulse
				const pulse = 0.5 + 0.5 * Math.sin(this.time * 0.08 + i * 2.1 + seed * 0.3);
				const alpha = dewAlpha * (0.3 + pulse * 0.5);
				const size = 1 + pulse * 0.8;

				// White-blue dew color
				const color = pulse > 0.5 ? 0xeeffff : 0xccddff;

				this.gfx.circle(cx + offsetX, headY + offsetY, size);
				this.gfx.fill({ color, alpha });
			}
		}
	}
}

function pseudoRandom(seed: number): number {
	let x = Math.sin(seed * 9301 + 49297) * 233280;
	return x - Math.floor(x);
}
