import { Container, Sprite, Texture, ImageSource, Graphics } from 'pixi.js';
import type { JournalEntry, FlowerDNA } from '$lib/types.js';
import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
import { renderFlower, renderFlowerFrame } from '$lib/generation/PixelArtRenderer.js';

const PIXEL_SCALE = 4;
const ANIM_FRAMES = 4;
const SPARKLE_COUNT = 8;

interface Sparkle {
	angle: number;
	dist: number;
	speed: number;
	size: number;
	phase: number;
}

export class FlowerSprite {
	container: Container;
	entry: JournalEntry;
	dna: FlowerDNA;
	private sprite: Sprite;
	private sparkleGfx: Graphics;
	private textures: Texture[] = [];
	private animPhase: number;
	private animSpeed: number;
	private hoverScale = 1;
	private targetHoverScale = 1;
	private isHovered = false;
	private sparkles: Sparkle[] = [];
	private sparkleAlpha = 0;

	// Bounds for manual hit testing (in world space, set after positioning)
	worldX = 0;
	worldY = 0;
	hitWidth = 0;
	hitHeight = 0;

	onClick: ((entry: JournalEntry) => void) | null = null;

	constructor(entry: JournalEntry) {
		this.entry = entry;
		this.dna = generateFlowerDNA(entry.mood, entry.flowerSeed);
		this.container = new Container();

		// Random animation timing per flower
		this.animPhase = (entry.flowerSeed % 1000) / 1000 * 100;
		this.animSpeed = 0.06 + ((entry.flowerSeed % 500) / 500) * 0.08;

		// Render base flower + animation frames
		const base = renderFlower(this.dna);
		for (let f = 0; f < ANIM_FRAMES; f++) {
			const frame = f === 0 ? base : renderFlowerFrame(base, f, entry.flowerSeed);
			this.textures.push(this.pixelsToTexture(frame.pixels, frame.width, frame.height));
		}

		this.sprite = new Sprite(this.textures[0]);
		this.sprite.scale.set(PIXEL_SCALE);
		this.sprite.anchor.set(0.5, 1);

		this.hitWidth = base.width * PIXEL_SCALE * 0.5;
		this.hitHeight = base.height * PIXEL_SCALE * 0.6;

		// Sparkle particles for hover indication
		this.sparkleGfx = new Graphics();
		for (let i = 0; i < SPARKLE_COUNT; i++) {
			this.sparkles.push({
				angle: (i / SPARKLE_COUNT) * Math.PI * 2,
				dist: 20 + Math.random() * 30,
				speed: 0.5 + Math.random() * 1.5,
				size: 2 + Math.random() * 2,
				phase: Math.random() * Math.PI * 2,
			});
		}

		this.container.addChild(this.sparkleGfx);
		this.container.addChild(this.sprite);
	}

	private pixelsToTexture(pixels: Uint8ClampedArray, w: number, h: number): Texture {
		const offscreen = document.createElement('canvas');
		offscreen.width = w;
		offscreen.height = h;
		const ctx = offscreen.getContext('2d')!;
		const pixelData = new Uint8ClampedArray(pixels.length);
		pixelData.set(pixels);
		const imageData = new ImageData(
			pixelData as unknown as Uint8ClampedArray<ArrayBuffer>,
			w,
			h
		);
		ctx.putImageData(imageData, 0, 0);
		const source = new ImageSource({ resource: offscreen, scaleMode: 'nearest' });
		return new Texture({ source });
	}

	setPosition(x: number, y: number) {
		this.worldX = x;
		this.worldY = y;
		this.container.position.set(x, y);
	}

	hitTest(wx: number, wy: number): boolean {
		const left = this.worldX - this.hitWidth / 2;
		const spriteFullHeight = this.sprite.height;
		const top = this.worldY - spriteFullHeight + (spriteFullHeight - this.hitHeight) * 0.2;
		return wx >= left && wx <= left + this.hitWidth && wy >= top && wy <= top + this.hitHeight;
	}

	setHover(hovered: boolean) {
		if (hovered === this.isHovered) return;
		this.isHovered = hovered;
		this.targetHoverScale = hovered ? 1.15 : 1;
	}

	update(_dt: number) {
		this.hoverScale += (this.targetHoverScale - this.hoverScale) * 0.15;

		const time = performance.now() / 1000;

		// Breathing
		const breathe = 1 + Math.sin(time * 0.5 + this.entry.flowerSeed * 0.7) * 0.018;
		this.container.scale.set(this.hoverScale * breathe);

		// Sway
		const swayAmount = 0.02 * (1 - this.dna.stemCurve * 0.5);
		this.container.rotation = Math.sin(time * 0.8 + this.entry.flowerSeed) * swayAmount;

		// Pixel animation frames
		const frameIdx = Math.floor((time * this.animSpeed + this.animPhase) % ANIM_FRAMES);
		this.sprite.texture = this.textures[frameIdx];

		// Sparkle hover effect — fade in/out
		const targetAlpha = this.isHovered ? 1 : 0;
		this.sparkleAlpha += (targetAlpha - this.sparkleAlpha) * 0.12;

		this.sparkleGfx.clear();
		if (this.sparkleAlpha > 0.01) {
			// Center sparkles on the flower head — shorter stems = lower center
			const headRatio = Math.min(1, this.dna.stemHeight / 24);
			const centerY = -this.sprite.height * (0.25 + headRatio * 0.3);
			for (const sp of this.sparkles) {
				const a = sp.angle + time * sp.speed;
				const pulse = 0.5 + 0.5 * Math.sin(time * 3 + sp.phase);
				const r = sp.dist + Math.sin(time * 2 + sp.phase) * 6;
				const sx = Math.cos(a) * r;
				const sy = centerY + Math.sin(a) * r * 0.6;
				const size = sp.size * (0.5 + pulse * 0.5);
				const alpha = this.sparkleAlpha * (0.4 + pulse * 0.6);

				// Draw a small cross/star shape
				this.sparkleGfx.rect(sx - size, sy - 1, size * 2, 2);
				this.sparkleGfx.rect(sx - 1, sy - size, 2, size * 2);
				this.sparkleGfx.fill({ color: 0xffffff, alpha });
			}
		}
	}

	destroy() {
		for (const t of this.textures) t.destroy(true);
		this.textures = [];
		this.container.destroy({ children: true });
	}
}
