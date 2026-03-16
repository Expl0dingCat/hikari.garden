import type { FlowerSprite } from './FlowerSprite.js';

export class MidnightBloom {
	private triggered: boolean;
	private active = false;
	private bloomTimer = 0;
	private checkCounter = 0;

	constructor() {
		this.triggered = typeof window !== 'undefined' &&
			sessionStorage.getItem('midnight-bloom-triggered') === 'true';
	}

	update(dt: number, flowers: FlowerSprite[]) {
		if (this.active) {
			this.bloomTimer += dt;

			// Calculate max distance for stagger
			let maxDist = 0;
			for (const f of flowers) {
				const d = Math.sqrt(f.worldX * f.worldX + f.worldY * f.worldY);
				if (d > maxDist) maxDist = d;
			}
			maxDist = Math.max(maxDist, 1);

			let allDone = true;
			for (const f of flowers) {
				if (!f.isGrown) continue;
				const dist = Math.sqrt(f.worldX * f.worldX + f.worldY * f.worldY);
				const delay = (dist / maxDist) * 60; // stagger frames
				const localT = this.bloomTimer - delay;

				if (localT < 0) {
					allDone = false;
					continue;
				}
				if (localT < 60) {
					f.bloomScale = 1 + 0.15 * Math.sin((localT / 60) * Math.PI);
					allDone = false;
				} else {
					f.bloomScale = 1;
				}
			}

			if (allDone) {
				this.active = false;
				for (const f of flowers) f.bloomScale = 1;
			}
			return;
		}

		if (this.triggered) return;

		// Check clock every ~60 frames
		this.checkCounter += dt;
		if (this.checkCounter < 60) return;
		this.checkCounter = 0;

		const now = new Date();
		if (now.getHours() === 0 && now.getMinutes() < 10) {
			this.triggered = true;
			this.active = true;
			this.bloomTimer = 0;
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('midnight-bloom-triggered', 'true');
			}
		}
	}
}
