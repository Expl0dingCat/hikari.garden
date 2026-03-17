import { Graphics } from 'pixi.js';

interface Ripple {
	x: number;
	y: number;
	radius: number;
	alpha: number;
}

/**
 * Clicking during rain creates ripple splashes on the ground.
 */
export class RainRipples {
	readonly gfx = new Graphics();
	private ripples: Ripple[] = [];
	private isRaining = false;

	setRaining(raining: boolean) {
		this.isRaining = raining;
	}

	/** Trigger ripples at a screen position (force=true bypasses rain check for debug) */
	trigger(screenX: number, screenY: number, force = false) {
		if (!this.isRaining && !force) return;

		// Main ripple + 2-3 smaller splash ripples
		this.ripples.push({ x: screenX, y: screenY, radius: 0, alpha: 0.7 });
		const count = 2 + Math.floor(Math.random() * 2);
		for (let i = 0; i < count; i++) {
			this.ripples.push({
				x: screenX + (Math.random() - 0.5) * 40,
				y: screenY + (Math.random() - 0.5) * 25,
				radius: 0,
				alpha: 0.4 + Math.random() * 0.2,
			});
		}
	}

	update(dt: number) {
		for (let i = this.ripples.length - 1; i >= 0; i--) {
			const r = this.ripples[i];
			r.radius += 0.8 * dt;
			r.alpha -= 0.012 * dt;
			if (r.alpha <= 0) this.ripples.splice(i, 1);
		}

		this.gfx.clear();
		if (this.ripples.length === 0) return;

		// Use darker color during day for visibility
		const h = new Date().getHours();
		const isDaytime = h >= 7 && h < 18;
		const color = isDaytime ? 0x556677 : 0xaaccee;

		for (const r of this.ripples) {
			this.gfx.circle(r.x, r.y, r.radius);
			this.gfx.stroke({ color, alpha: r.alpha, width: 1.5 });
		}
	}

	destroy() {
		this.ripples = [];
		this.gfx.destroy();
	}
}
