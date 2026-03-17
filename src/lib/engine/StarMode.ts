import { Graphics } from 'pixi.js';
import type { FlowerSprite } from './FlowerSprite.js';

/**
 * Secret "stars" mode: transforms flowers into constellation points
 * with connecting lines between nearby flowers.
 * Triggered by typing "stars" on keyboard.
 */
export class StarMode {
	gfx: Graphics;
	private active = false;
	private timer = 0;
	private duration = 600; // ~10 seconds at 60fps
	private fadeIn = 60;
	private fadeOut = 120;

	constructor() {
		this.gfx = new Graphics();
	}

	trigger() {
		this.active = true;
		this.timer = 0;
	}

	get isActive(): boolean {
		return this.active;
	}

	update(dt: number, flowers: FlowerSprite[]) {
		if (!this.active) {
			this.gfx.visible = false;
			return;
		}

		this.timer += dt;
		if (this.timer >= this.duration) {
			this.active = false;
			this.gfx.visible = false;
			// Restore flowers
			for (const f of flowers) {
				f.bloomScale = 1;
				f.container.alpha = 1;
			}
			return;
		}

		this.gfx.visible = true;
		this.gfx.clear();

		// Compute fade
		let alpha = 1;
		if (this.timer < this.fadeIn) {
			alpha = this.timer / this.fadeIn;
		} else if (this.timer > this.duration - this.fadeOut) {
			alpha = (this.duration - this.timer) / this.fadeOut;
		}

		// Shrink flowers to points of light
		for (const f of flowers) {
			if (!f.isGrown) continue;
			f.bloomScale = 1 - alpha * 0.7; // shrink to 30%
			f.container.alpha = 1 - alpha * 0.6; // fade to 40%
		}

		// Draw constellation points and lines
		const grownFlowers = flowers.filter(f => f.isGrown);

		// Draw connecting lines between nearby flowers
		const connectionDist = 120;
		for (let i = 0; i < grownFlowers.length; i++) {
			for (let j = i + 1; j < grownFlowers.length; j++) {
				const a = grownFlowers[i];
				const b = grownFlowers[j];
				const dx = a.worldX - b.worldX;
				const dy = a.worldY - b.worldY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < connectionDist) {
					const lineAlpha = alpha * 0.12 * (1 - dist / connectionDist);
					this.gfx.moveTo(a.container.position.x, a.container.position.y - a.flowerHeight * 0.7);
					this.gfx.lineTo(b.container.position.x, b.container.position.y - b.flowerHeight * 0.7);
					this.gfx.stroke({ color: 0xaaccff, alpha: lineAlpha, width: 1 });
				}
			}
		}

		// Draw bright star points at each flower head
		const time = this.timer * 0.05;
		for (const f of grownFlowers) {
			const fx = f.container.position.x;
			const fy = f.container.position.y - f.flowerHeight * 0.7;
			const twinkle = 0.5 + 0.5 * Math.sin(time + f.entry.flowerSeed);
			const starAlpha = alpha * (0.5 + twinkle * 0.5);
			const size = 2 + twinkle;

			// Star glow
			this.gfx.circle(fx, fy, size + 2);
			this.gfx.fill({ color: 0xaaccff, alpha: starAlpha * 0.3 });
			// Star core
			this.gfx.circle(fx, fy, size);
			this.gfx.fill({ color: 0xffffff, alpha: starAlpha });
		}
	}
}
