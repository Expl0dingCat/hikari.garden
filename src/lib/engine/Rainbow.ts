import { Graphics } from 'pixi.js';

/**
 * Rainbow arc that appears when weather transitions from rain to clear.
 * Fades in over 5s, holds 50s, fades out over 5s.
 */
export class Rainbow {
	gfx: Graphics;
	private active = false;
	private timer = 0;
	private duration = 3600; // ~60 seconds at 60fps
	private fadeIn = 300;   // 5 seconds
	private fadeOut = 300;  // 5 seconds
	private screenW = 0;
	private screenH = 0;
	private prevCondition = '';

	private readonly colors = [
		0xff0000, // red
		0xff7700, // orange
		0xffdd00, // yellow
		0x00cc44, // green
		0x0066ff, // blue
		0x4400cc, // indigo
		0x8800aa, // violet
	];

	constructor() {
		this.gfx = new Graphics();
	}

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	/** Call when weather updates — detects rain→clear transition */
	checkWeather(condition: string) {
		const wasRainy = ['rain', 'drizzle', 'showers', 'storm'].includes(this.prevCondition);
		const isClear = condition === 'clear';

		if (wasRainy && isClear && !this.active) {
			this.trigger();
		}

		this.prevCondition = condition;
	}

	/** Force trigger for debug */
	trigger() {
		this.active = true;
		this.timer = 0;
	}

	update(dt: number) {
		if (!this.active) {
			this.gfx.visible = false;
			return;
		}

		this.timer += dt;
		if (this.timer >= this.duration) {
			this.active = false;
			this.gfx.visible = false;
			return;
		}

		this.gfx.visible = true;
		this.gfx.clear();

		// Compute alpha based on fade in/out
		let alpha = 1;
		if (this.timer < this.fadeIn) {
			alpha = this.timer / this.fadeIn;
		} else if (this.timer > this.duration - this.fadeOut) {
			alpha = (this.duration - this.timer) / this.fadeOut;
		}
		alpha *= 0.06; // Very subtle — barely visible

		// Draw rainbow arcs
		const cx = this.screenW * 0.5;
		const cy = this.screenH * 0.85;
		const baseRadius = Math.min(this.screenW, this.screenH) * 0.6;

		for (let i = 0; i < this.colors.length; i++) {
			const radius = baseRadius + i * 8;
			// Draw arc from left to right (PI to 0)
			this.gfx.arc(cx, cy, radius, Math.PI, 0);
			this.gfx.stroke({ color: this.colors[i], alpha, width: 6 });
		}
	}
}
