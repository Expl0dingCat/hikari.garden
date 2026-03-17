import type { FlowerSprite } from './FlowerSprite.js';

interface AnniversarySparkle {
	flower: FlowerSprite;
	timer: number; // 0..1 progress
	sparkles: { angle: number; dist: number; speed: number; size: number; phase: number }[];
}

const SPARKLE_COUNT = 12;
const DURATION = 300; // frames (~5 seconds)
const GOLD_COLORS = [0xffd700, 0xffb347, 0xffe066, 0xffa500];

/**
 * Flowers get golden sparkles on the anniversary of their planting date.
 * Uses gold-colored, larger sparkles with a swirl pattern to differentiate from hover sparkles.
 */
export class AnniversaryGlow {
	private checkTimer = 0;
	private active: AnniversarySparkle[] = [];

	update(dt: number, flowers: FlowerSprite[]) {
		this.checkTimer += dt;

		// Check every ~120 frames (~2 seconds)
		if (this.checkTimer > 120) {
			this.checkTimer = 0;
			const now = new Date();
			const todayMonth = now.getMonth();
			const todayDay = now.getDate();

			for (const flower of flowers) {
				if (!flower.isGrown) continue;
				if (this.active.some((a) => a.flower === flower)) continue;

				const d = new Date(flower.entry.date + 'T00:00:00');
				if (d.getMonth() === todayMonth && d.getDate() === todayDay && d.getFullYear() !== now.getFullYear()) {
					this.activate(flower);
				}
			}
		}

		// Update + draw active sparkles
		const time = performance.now() / 1000;
		for (let i = this.active.length - 1; i >= 0; i--) {
			const a = this.active[i];
			a.timer += dt / DURATION;
			if (a.timer >= 1) {
				// Clear the sparkle graphics
				a.flower.anniversaryGfx?.clear();
				this.active.splice(i, 1);
				continue;
			}

			const gfx = a.flower.anniversaryGfx;
			if (!gfx) continue;
			gfx.clear();

			// Fade in then out
			const fade = a.timer < 0.15 ? a.timer / 0.15 : a.timer > 0.8 ? (1 - a.timer) / 0.2 : 1;
			const headRatio = Math.min(1, a.flower.dna.stemHeight / 24);
			const centerY = -a.flower.container.height * (0.25 + headRatio * 0.3);

			for (const sp of a.sparkles) {
				// Swirl outward over time
				const swirlAngle = sp.angle + time * sp.speed + a.timer * Math.PI * 2;
				const expandDist = sp.dist * (0.5 + a.timer * 0.8);
				const pulse = 0.5 + 0.5 * Math.sin(time * 4 + sp.phase);

				const sx = Math.cos(swirlAngle) * expandDist;
				const sy = centerY + Math.sin(swirlAngle) * expandDist * 0.6;
				const size = sp.size * (0.6 + pulse * 0.4);
				const alpha = fade * (0.5 + pulse * 0.5);
				const color = GOLD_COLORS[Math.floor((sp.phase * 10) % GOLD_COLORS.length)];

				// Diamond shape (rotated square)
				gfx.rect(sx - size, sy - 1, size * 2, 2);
				gfx.rect(sx - 1, sy - size, 2, size * 2);
				gfx.fill({ color, alpha });

				// Small glow dot
				gfx.circle(sx, sy, size * 0.6);
				gfx.fill({ color, alpha: alpha * 0.3 });
			}
		}
	}

	/** Manually trigger anniversary sparkle on a flower (used by debug) */
	activate(flower: FlowerSprite) {
		if (this.active.some((a) => a.flower === flower)) return;

		// Ensure the flower has an anniversary graphics layer
		flower.ensureAnniversaryGfx();

		const sparkles = [];
		for (let i = 0; i < SPARKLE_COUNT; i++) {
			sparkles.push({
				angle: (i / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.3,
				dist: 18 + Math.random() * 25,
				speed: 0.4 + Math.random() * 1.2,
				size: 2.5 + Math.random() * 2.5,
				phase: Math.random() * Math.PI * 2,
			});
		}
		this.active.push({ flower, timer: 0, sparkles });
	}

	destroy() {
		for (const a of this.active) {
			a.flower.anniversaryGfx?.clear();
		}
		this.active = [];
	}
}
