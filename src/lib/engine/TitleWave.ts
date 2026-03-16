import type { FlowerSprite } from './FlowerSprite.js';

export class TitleWave {
	private active = false;
	private waveTimer = 0;
	private maxDelay = 0;

	trigger(flowers: FlowerSprite[]) {
		this.active = true;
		this.waveTimer = 0;

		// Pre-calculate max distance for stagger
		this.maxDelay = 0;
		for (const f of flowers) {
			const dist = Math.sqrt(f.worldX * f.worldX + f.worldY * f.worldY);
			const delay = dist * 0.15;
			if (delay > this.maxDelay) this.maxDelay = delay;
		}
	}

	update(dt: number, flowers: FlowerSprite[]) {
		if (!this.active) return;

		this.waveTimer += dt;

		let allDone = true;
		for (const f of flowers) {
			if (!f.isGrown) continue;
			const dist = Math.sqrt(f.worldX * f.worldX + f.worldY * f.worldY);
			const delay = dist * 0.15;
			const localT = this.waveTimer - delay;

			if (localT < 0) {
				allDone = false;
				continue;
			}
			if (localT < 30) {
				f.bloomScale = 1 + 0.2 * Math.sin((localT / 30) * Math.PI);
				allDone = false;
			} else {
				f.bloomScale = 1;
			}
		}

		if (allDone || this.waveTimer > this.maxDelay + 35) {
			this.active = false;
			for (const f of flowers) f.bloomScale = 1;
		}
	}
}
