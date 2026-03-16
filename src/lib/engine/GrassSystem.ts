import { Container, Sprite, Texture, ImageSource } from 'pixi.js';

const GRASS_COLORS = [
	0x4a7c59, 0x3d6b4e, 0x5a8a65, 0x6b9970, 0x3e7048,
	0x4e8560, 0x588a5c, 0x467052, 0x5c9468, 0x3a6045,
	0x4f7a50, 0x558855, 0x3b5e40, 0x689e6a, 0x527a4d
];

const CLUMP_W = 14;
const CLUMP_H = 18;
const SCALE = 3;
const VARIATIONS = 16;
const FRAMES = 4;
const SPACING = 16;
const FLOWER_CLEAR_RADIUS = 28;

interface Stalk {
	x: number;
	width: number;
	height: number;
	color: number;
	hasTip: boolean;
	tipColor: number;
	tipWidth: number;
	bend: -1 | 0 | 1;
	bendHeight: number; // pixel row where bend starts (from base)
}

interface PlacedClump {
	sprite: Sprite;
	x: number;
	y: number;
	variation: number;
	phase: number;
	speed: number; // random animation speed per clump
	lodPriority: number;
	growDelay: number;
	growProgress: number;
	shrinkDelay: number;
	shrinkProgress: number;
}

function hexToRgb(hex: number): [number, number, number] {
	return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function pickColor(): number {
	return GRASS_COLORS[Math.floor(Math.random() * GRASS_COLORS.length)];
}

function generateStalkPattern(): Stalk[] {
	const count = 2 + Math.floor(Math.random() * 5); // 2-6 stalks
	const stalks: Stalk[] = [];

	for (let i = 0; i < count; i++) {
		const bend: -1 | 0 | 1 = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
		stalks.push({
			x: 1 + Math.floor(Math.random() * (CLUMP_W - 3)),
			width: Math.random() < 0.65 ? 1 : 2,
			height: 3 + Math.floor(Math.random() * 6), // 3-8px
			color: pickColor(),
			hasTip: Math.random() < 0.3,
			tipColor: pickColor(),
			tipWidth: Math.random() < 0.5 ? 3 : 2,
			bend,
			bendHeight: 3 + Math.floor(Math.random() * 5) // bend starts 3-7px from base
		});
	}

	return stalks;
}

/** Render a single animation frame. Each stalk gets a per-stalk wobble offset. */
function renderFrame(stalks: Stalk[], frameIndex: number): Texture {
	const canvas = document.createElement('canvas');
	canvas.width = CLUMP_W;
	canvas.height = CLUMP_H;
	const ctx = canvas.getContext('2d')!;

	for (let i = 0; i < stalks.length; i++) {
		const s = stalks[i];
		const [r, g, b] = hexToRgb(s.color);

		// Per-stalk wobble: each stalk shifts independently across frames
		const wobble = Math.round(Math.sin(frameIndex * 1.57 + i * 2.3) * 0.8);
		let sx = s.x + wobble;
		sx = Math.max(0, Math.min(CLUMP_W - s.width, sx));

		ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;

		if (s.bend !== 0 && s.height > s.bendHeight + 2) {
			// Lower section: straight
			ctx.fillRect(sx, CLUMP_H - s.bendHeight, s.width, s.bendHeight);
			// Upper section: offset by bend direction
			const upperH = s.height - s.bendHeight;
			const bx = Math.max(0, Math.min(CLUMP_W - s.width, sx + s.bend));
			ctx.fillRect(bx, CLUMP_H - s.height, s.width, upperH);
		} else {
			// Straight stalk
			ctx.fillRect(sx, CLUMP_H - s.height, s.width, s.height);
		}

		// Tip / seed head: wider block at top
		if (s.hasTip) {
			const [tr, tg, tb] = hexToRgb(s.tipColor);
			ctx.fillStyle = `rgba(${tr},${tg},${tb},0.9)`;
			const tipX = s.bend !== 0 && s.height > s.bendHeight + 2
				? Math.max(0, Math.min(CLUMP_W - s.tipWidth, sx + s.bend - Math.floor(s.tipWidth / 2)))
				: Math.max(0, Math.min(CLUMP_W - s.tipWidth, sx - Math.floor((s.tipWidth - s.width) / 2)));
			ctx.fillRect(tipX, CLUMP_H - s.height - 1, s.tipWidth, 2);
		}
	}

	const source = new ImageSource({ resource: canvas, scaleMode: 'nearest' });
	return new Texture({ source });
}

export class GrassSystem {
	container: Container;
	private clumps: PlacedClump[] = [];
	/** textures[variation][frame] */
	private textures: Texture[][] = [];
	private generated = false;
	private growInActive = false;
	private shrinkOutActive = false;
	private gardenRadius = 0;

	constructor() {
		this.container = new Container();
	}

	private ensureTextures() {
		if (this.textures.length > 0) return;

		for (let v = 0; v < VARIATIONS; v++) {
			const stalks = generateStalkPattern();
			const frames: Texture[] = [];
			for (let f = 0; f < FRAMES; f++) {
				frames.push(renderFrame(stalks, f));
			}
			this.textures.push(frames);
		}
	}

	generate(
		bounds: { minX: number; maxX: number; minY: number; maxY: number },
		flowerPositions: { x: number; y: number }[]
	) {
		for (const c of this.clumps) c.sprite.destroy();
		this.clumps = [];
		this.container.removeChildren();
		this.shrinkOutActive = false;

		this.ensureTextures();

		// Circular garden boundary: radius from furthest flower + padding
		const padding = 120;
		let maxFlowerDist = 0;
		for (const fp of flowerPositions) {
			const d = Math.sqrt(fp.x * fp.x + fp.y * fp.y);
			if (d > maxFlowerDist) maxFlowerDist = d;
		}
		const gardenRadius = maxFlowerDist + padding;
		const gardenRadiusSq = gardenRadius * gardenRadius;

		// Iterate over a grid covering the circle's bounding box
		const left = -gardenRadius;
		const right = gardenRadius;
		const top = -gardenRadius;
		const bottom = gardenRadius;

		let lodCounter = 0;

		for (let gx = left; gx < right; gx += SPACING) {
			for (let gy = top; gy < bottom; gy += SPACING) {
				const x = gx + (Math.random() - 0.5) * SPACING * 0.8;
				const y = gy + (Math.random() - 0.5) * SPACING * 0.8;

				// Circular garden edge
				if (x * x + y * y > gardenRadiusSq) continue;

				// Circular clearing around flowers
				let tooClose = false;
				for (const fp of flowerPositions) {
					const dx = x - fp.x;
					const dy = y - fp.y;
					if (dx * dx + dy * dy < FLOWER_CLEAR_RADIUS * FLOWER_CLEAR_RADIUS) {
						tooClose = true;
						break;
					}
				}
				if (tooClose) continue;

				const variation = Math.floor(Math.random() * VARIATIONS);
				const sprite = new Sprite(this.textures[variation][0]);
				sprite.scale.set(SCALE);
				sprite.anchor.set(0.5, 1);
				sprite.position.set(x, y);

				this.container.addChild(sprite);

				// LOD priority: 0 = always, 1 = mid+close, 2 = close only
				const lod = lodCounter % 4 === 0 ? 0 : lodCounter % 2 === 0 ? 1 : 2;
				lodCounter++;

				// Grow delay based on distance from center
				const dist = Math.sqrt(x * x + y * y);
				const growDelay = (dist / Math.max(1, gardenRadius)) * 3 + Math.random() * 0.3;

				sprite.scale.set(0);

				this.clumps.push({
					sprite,
					x, y,
					variation,
					phase: Math.random() * 100,
					speed: 0.04 + Math.random() * 0.08,
					lodPriority: lod,
					growDelay,
					growProgress: 0,
					shrinkDelay: 0,
					shrinkProgress: 0
				});
			}
		}

		this.gardenRadius = gardenRadius;
		this.growInActive = true;
		this.generated = true;
	}

	/** Start shrink-out animation — outside-in, reverse of grow */
	shrinkOut() {
		this.shrinkOutActive = true;
		this.growInActive = false;
		for (const clump of this.clumps) {
			const dist = Math.sqrt(clump.x * clump.x + clump.y * clump.y);
			// Outside shrinks first (lower delay), center shrinks last
			clump.shrinkDelay = ((this.gardenRadius - dist) / Math.max(1, this.gardenRadius)) * 1.5 + Math.random() * 0.2;
			clump.shrinkProgress = 0;
		}
	}

	get allShrunk(): boolean {
		if (!this.shrinkOutActive) return true;
		return this.clumps.every((c) => c.shrinkProgress >= 1);
	}

	update(dt: number, zoom: number = 1, viewBounds?: { left: number; right: number; top: number; bottom: number }) {
		if (!this.generated || this.clumps.length === 0) return;

		const time = performance.now() / 1000;
		const maxLod = zoom < 0.4 ? 0 : zoom < 0.8 ? 1 : 2;
		const margin = (CLUMP_W * SCALE) / 2 + 10;
		const dtSec = dt / 60;
		let allGrown = true;
		let allShrunk = true;

		for (const clump of this.clumps) {
			// Shrink-out animation (takes priority)
			if (this.shrinkOutActive) {
				if (clump.shrinkProgress < 1) {
					clump.shrinkDelay -= dtSec;
					if (clump.shrinkDelay > 0) {
						allShrunk = false;
						continue;
					}
					clump.shrinkProgress = Math.min(1, clump.shrinkProgress + 0.06);
					const t = 1 - clump.shrinkProgress;
					clump.sprite.scale.set(SCALE * t * t); // ease-in shrink
					allShrunk = false;
				} else {
					clump.sprite.scale.set(0);
				}
				continue;
			}

			// Grow-in animation
			if (this.growInActive && clump.growProgress < 1) {
				clump.growDelay -= dtSec;
				if (clump.growDelay > 0) {
					clump.sprite.scale.set(0);
					allGrown = false;
					continue;
				}
				clump.growProgress = Math.min(1, clump.growProgress + 0.06);
				const t = clump.growProgress;
				const ease = 1 - Math.pow(1 - t, 3);
				clump.sprite.scale.set(SCALE * ease);
				allGrown = false;
				continue;
			}

			// LOD cull
			if (clump.lodPriority > maxLod) {
				clump.sprite.visible = false;
				continue;
			}

			// Frustum cull
			if (viewBounds) {
				if (clump.x < viewBounds.left - margin || clump.x > viewBounds.right + margin ||
					clump.y < viewBounds.top - margin || clump.y > viewBounds.bottom + margin) {
					clump.sprite.visible = false;
					continue;
				}
			}

			clump.sprite.visible = true;

			// Evolving: cycle frames slowly, each clump at its own random pace
			const frameIdx = Math.floor((time * clump.speed + clump.phase) % FRAMES);
			clump.sprite.texture = this.textures[clump.variation][frameIdx];
		}

		if (this.growInActive && allGrown) {
			this.growInActive = false;
		}
		if (this.shrinkOutActive && allShrunk) {
			this.shrinkOutActive = false;
		}
	}

	destroy() {
		for (const group of this.textures) {
			for (const t of group) t.destroy(true);
		}
		this.textures = [];
		this.container.destroy({ children: true });
	}
}
