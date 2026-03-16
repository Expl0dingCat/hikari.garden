import { Container, Graphics } from 'pixi.js';
import { getTimePhase } from './TimeOfDay.js';
import type { FlowerSprite } from './FlowerSprite.js';

type VisitorType = 'butterfly' | 'firefly';
type VisitorState = 'flying' | 'landing' | 'landed' | 'scattering';

interface Visitor {
	type: VisitorType;
	x: number;
	y: number;
	vx: number;
	vy: number;
	targetX: number;
	targetY: number;
	state: VisitorState;
	life: number;
	landTimer: number;
	phase: number; // random offset for oscillation
	wingOpen: boolean;
	wingTimer: number;
	alpha: number;
	scatterVx: number;
	scatterVy: number;
}

const MAX_VISITORS = 10;
const IDLE_THRESHOLD = 30 * 60; // 30 seconds in frames
const SPAWN_INTERVAL = 3 * 60; // 3 seconds in frames

export class IdleVisitors {
	container: Container;
	private gfx: Graphics;
	private visitors: Visitor[] = [];
	private idleTimer = 0;
	private spawnTimer = 0;
	private lastPhase: string = '';

	constructor() {
		this.container = new Container();
		this.gfx = new Graphics();
		this.container.addChild(this.gfx);
	}

	resetIdle() {
		if (this.idleTimer >= IDLE_THRESHOLD && this.visitors.length > 0) {
			this.scatter();
		}
		this.idleTimer = 0;
		this.spawnTimer = 0;
	}

	private scatter() {
		for (const v of this.visitors) {
			if (v.state === 'scattering') continue;
			v.state = 'scattering';
			// Fly outward in a random direction
			const angle = Math.random() * Math.PI * 2;
			v.scatterVx = Math.cos(angle) * 5;
			v.scatterVy = Math.sin(angle) * 5;
		}
	}

	private getVisitorType(): VisitorType {
		const phase = getTimePhase();
		return (phase === 'night' || phase === 'dusk') ? 'firefly' : 'butterfly';
	}

	private spawnVisitor(flowers: FlowerSprite[]) {
		const type = this.getVisitorType();

		let targetX: number, targetY: number;

		if (type === 'butterfly' && flowers.length > 0) {
			const target = flowers[Math.floor(Math.random() * flowers.length)];
			targetX = target.worldX;
			targetY = target.worldY - target.flowerHeight;
		} else {
			// Fireflies roam randomly in the garden area
			targetX = (Math.random() - 0.5) * 600;
			targetY = (Math.random() - 0.5) * 400;
		}

		// Start from a random edge
		const edge = Math.random();
		let startX: number, startY: number;
		if (edge < 0.25) { startX = targetX - 300; startY = targetY + (Math.random() - 0.5) * 200; }
		else if (edge < 0.5) { startX = targetX + 300; startY = targetY + (Math.random() - 0.5) * 200; }
		else if (edge < 0.75) { startX = targetX + (Math.random() - 0.5) * 200; startY = targetY - 300; }
		else { startX = targetX + (Math.random() - 0.5) * 200; startY = targetY + 300; }

		this.visitors.push({
			type,
			x: startX,
			y: startY,
			vx: 0,
			vy: 0,
			targetX,
			targetY,
			state: 'flying',
			life: 0,
			landTimer: 0,
			phase: Math.random() * Math.PI * 2,
			wingOpen: true,
			wingTimer: 0,
			alpha: 1,
			scatterVx: 0,
			scatterVy: 0
		});
	}

	private pickNewTarget(v: Visitor, flowers: FlowerSprite[]) {
		if (v.type === 'butterfly' && flowers.length > 0) {
			const target = flowers[Math.floor(Math.random() * flowers.length)];
			v.targetX = target.worldX;
			v.targetY = target.worldY - target.flowerHeight;
		} else {
			v.targetX = v.x + (Math.random() - 0.5) * 300;
			v.targetY = v.y + (Math.random() - 0.5) * 200;
		}
		v.state = 'flying';
	}

	update(dt: number, flowers: FlowerSprite[]) {
		const time = performance.now() / 1000;
		const phase = getTimePhase();

		// If phase changed, scatter existing visitors (different type needed)
		if (this.lastPhase && this.lastPhase !== phase && this.visitors.length > 0) {
			this.scatter();
		}
		this.lastPhase = phase;

		this.idleTimer += dt;

		// Spawn visitors when idle
		if (this.idleTimer >= IDLE_THRESHOLD && this.visitors.length < MAX_VISITORS) {
			const type = this.getVisitorType();
			// Skip butterfly spawning if no flowers (fireflies can always spawn)
			if (type !== 'butterfly' || flowers.length > 0) {
				this.spawnTimer += dt;
				if (this.spawnTimer >= SPAWN_INTERVAL) {
					this.spawnTimer = 0;
					this.spawnVisitor(flowers);
				}
			}
		}

		// Update visitors — swap-remove
		let len = this.visitors.length;
		for (let i = len - 1; i >= 0; i--) {
			const v = this.visitors[i];
			v.life += dt;

			if (v.state === 'scattering') {
				v.x += v.scatterVx * dt;
				v.y += v.scatterVy * dt;
				v.alpha -= 0.03 * dt;
				if (v.alpha <= 0) {
					this.visitors[i] = this.visitors[len - 1];
					len--;
				}
				continue;
			}

			if (v.state === 'flying') {
				const dx = v.targetX - v.x;
				const dy = v.targetY - v.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < 15) {
					if (v.type === 'butterfly') {
						v.state = 'landing';
						v.landTimer = 0;
					} else {
						this.pickNewTarget(v, flowers);
					}
				} else {
					const speed = v.type === 'butterfly' ? 1.2 : 0.6;
					v.vx = (dx / dist) * speed;
					v.vy = (dy / dist) * speed;

					// Flutter/drift oscillation
					if (v.type === 'butterfly') {
						v.vy += Math.sin(time * 4 + v.phase) * 0.5;
						v.vx += Math.cos(time * 3 + v.phase) * 0.3;
					} else {
						// Firefly erratic jitter
						if (Math.floor(v.life) % 30 === 0) {
							v.vx += (Math.random() - 0.5) * 0.8;
							v.vy += (Math.random() - 0.5) * 0.8;
						}
					}

					v.x += v.vx * dt;
					v.y += v.vy * dt;
				}
			}

			if (v.state === 'landing') {
				v.landTimer += dt;
				// Slow descent to perch
				v.y += (v.targetY - v.y) * 0.05;
				v.x += (v.targetX - v.x) * 0.05;
				if (v.landTimer > 20) {
					v.state = 'landed';
					v.landTimer = 0;
				}
			}

			if (v.state === 'landed') {
				v.landTimer += dt;
				// Rest on flower for 60-120 frames, then pick new target
				if (v.landTimer > 60 + Math.random() * 60) {
					this.pickNewTarget(v, flowers);
				}
			}

			// Wing animation (butterflies)
			if (v.type === 'butterfly') {
				v.wingTimer += dt;
				if (v.state === 'landed') {
					// Slow wing beats when landed
					if (v.wingTimer > 20) { v.wingOpen = !v.wingOpen; v.wingTimer = 0; }
				} else {
					if (v.wingTimer > 6) { v.wingOpen = !v.wingOpen; v.wingTimer = 0; }
				}
			}
		}
		this.visitors.length = len;

		// Draw
		this.gfx.clear();
		for (const v of this.visitors) {
			const a = Math.max(0, v.alpha);

			if (v.type === 'butterfly') {
				// Small pixel butterfly: body + wings
				const wingW = v.wingOpen ? 3 : 1;
				// Body
				this.gfx.rect(v.x - 0.5, v.y - 1.5, 1, 3);
				this.gfx.fill({ color: 0x443322, alpha: a });
				// Wings
				this.gfx.rect(v.x - wingW - 0.5, v.y - 1, wingW, 2);
				this.gfx.rect(v.x + 0.5, v.y - 1, wingW, 2);
				this.gfx.fill({ color: 0xffcc77, alpha: a * 0.8 });
			} else {
				// Firefly: glowing dot
				const pulse = 0.3 + 0.7 * Math.sin(time * 3 + v.phase);
				// Glow ring
				this.gfx.circle(v.x, v.y, 5);
				this.gfx.fill({ color: 0xccff66, alpha: a * pulse * 0.12 });
				// Core
				this.gfx.circle(v.x, v.y, 2);
				this.gfx.fill({ color: 0xeeffaa, alpha: a * (0.4 + pulse * 0.6) });
			}
		}
	}

	destroy() {
		this.gfx.destroy();
		this.container.destroy({ children: true });
	}
}
