import { Graphics } from 'pixi.js';

const LS_KEY = 'hikari-first-flower-seen';

interface GoldenMote {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	phase: number;
	life: number;
}

/**
 * Special ceremony when the very first flower is ever planted.
 * Golden light radiates outward, motes circle the flower, and
 * "a garden begins" fades in.
 * Only triggers once (localStorage gate).
 */
export class FirstFlowerCeremony {
	readonly gfx = new Graphics();
	private active = false;
	private timer = 0;
	private duration = 360; // 6 seconds at 60fps
	private motes: GoldenMote[] = [];
	private flowerX = 0;
	private flowerY = 0;
	private screenW = 0;
	private screenH = 0;

	/** Text callback for the UI layer to show "a garden begins" */
	onShowText: ((text: string, alpha: number) => void) | null = null;

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	/**
	 * Check if this is the very first flower (0→1 transition).
	 * Call after loadEntries when previousCount was 0 and new count >= 1.
	 */
	tryTrigger(previousCount: number, newCount: number, flowerScreenX: number, flowerScreenY: number): boolean {
		if (previousCount !== 0 || newCount < 1) return false;

		// Only trigger once ever
		try {
			if (localStorage.getItem(LS_KEY)) return false;
			localStorage.setItem(LS_KEY, '1');
		} catch {
			// localStorage unavailable — proceed anyway
		}

		this.active = true;
		this.timer = 0;
		this.flowerX = flowerScreenX;
		this.flowerY = flowerScreenY;
		this.spawnMotes();
		return true;
	}

	/** Force trigger for debug */
	trigger(x?: number, y?: number) {
		this.active = true;
		this.timer = 0;
		this.flowerX = x ?? this.screenW / 2;
		this.flowerY = y ?? this.screenH * 0.4;
		this.spawnMotes();
	}

	private spawnMotes() {
		this.motes = [];
		for (let i = 0; i < 24; i++) {
			const angle = (i / 24) * Math.PI * 2;
			const dist = 20 + Math.random() * 30;
			this.motes.push({
				x: this.flowerX + Math.cos(angle) * dist,
				y: this.flowerY + Math.sin(angle) * dist,
				vx: Math.cos(angle) * 0.3,
				vy: Math.sin(angle) * 0.3 - 0.2,
				size: 1.5 + Math.random() * 2,
				phase: Math.random() * Math.PI * 2,
				life: 200 + Math.random() * 160,
			});
		}
	}

	get isActive(): boolean {
		return this.active;
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
			this.motes = [];
			this.onShowText?.('' , 0);
			return;
		}

		this.gfx.visible = true;
		this.gfx.clear();

		const progress = this.timer / this.duration;

		// Fade envelope: fade in 0-0.15, hold, fade out 0.8-1.0
		let alpha = 1;
		if (progress < 0.15) alpha = progress / 0.15;
		else if (progress > 0.8) alpha = (1 - progress) / 0.2;

		// Golden radial glow expanding outward
		const glowRadius = 40 + progress * 120;
		this.gfx.circle(this.flowerX, this.flowerY, glowRadius);
		this.gfx.fill({ color: 0xffd700, alpha: alpha * 0.06 });
		this.gfx.circle(this.flowerX, this.flowerY, glowRadius * 0.5);
		this.gfx.fill({ color: 0xfff3b0, alpha: alpha * 0.08 });

		// Update and draw motes
		const time = this.timer * 0.03;
		for (let i = this.motes.length - 1; i >= 0; i--) {
			const m = this.motes[i];
			// Orbit gently around the flower
			const dx = m.x - this.flowerX;
			const dy = m.y - this.flowerY;
			const angle = Math.atan2(dy, dx) + 0.01 * dt;
			const dist = Math.sqrt(dx * dx + dy * dy) + 0.1 * dt;
			m.x = this.flowerX + Math.cos(angle) * dist;
			m.y = this.flowerY + Math.sin(angle) * dist + m.vy * dt;
			m.vy -= 0.005 * dt; // float upward slightly
			m.life -= dt;

			if (m.life <= 0) {
				this.motes.splice(i, 1);
				continue;
			}

			const moteAlpha = alpha * Math.min(1, m.life / 30);
			const twinkle = 0.6 + 0.4 * Math.sin(time + m.phase);

			// Glow
			this.gfx.circle(m.x, m.y, m.size + 2);
			this.gfx.fill({ color: 0xffd700, alpha: moteAlpha * twinkle * 0.3 });
			// Core
			this.gfx.circle(m.x, m.y, m.size);
			this.gfx.fill({ color: 0xfffff0, alpha: moteAlpha * twinkle });
		}

		// Show text "a garden begins" during the middle of the ceremony
		if (progress > 0.25 && progress < 0.85) {
			let textAlpha = 1;
			if (progress < 0.35) textAlpha = (progress - 0.25) / 0.1;
			else if (progress > 0.75) textAlpha = (0.85 - progress) / 0.1;
			this.onShowText?.('a garden begins', textAlpha);
		} else {
			this.onShowText?.('', 0);
		}
	}

	destroy() {
		this.motes = [];
		this.gfx.destroy();
	}
}
