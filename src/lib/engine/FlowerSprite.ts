import { Container, Sprite, Texture, BufferImageSource, Graphics, type Renderer } from 'pixi.js';
import type { JournalEntry, FlowerDNA } from '$lib/types.js';
import { generateFlowerDNA } from '$lib/generation/FlowerDNA.js';
import { renderFlower, renderFlowerFrame } from '$lib/generation/PixelArtRenderer.js';

const PIXEL_SCALE = 4;
const ANIM_FRAMES = 4;
const SPARKLE_COUNT = 8;
let textureIdCounter = 0;


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
	private growProgress = 1; // 0 = hidden, 1 = fully grown
	private growDelay = 0;
	private growStarted = false;
	private shrinking = false;
	private shrinkProgress = 0;
	private shrinkDelay = 0;
	private shrinkStarted = false;
	private sparkles: Sparkle[] = [];
	private sparkleAlpha = 0;

	/** Temporary scale multiplier used by MidnightBloom and TitleWave effects */
	bloomScale = 1;

	/** Night sleep factor — set by engine based on time of day (0 = awake, 1 = sleeping) */
	sleepFactor = 0;

	/** Global wind lean — set by engine's WindSystem */
	windLean = 0;

	/** Graphics layer for anniversary golden sparkles (created lazily) */
	anniversaryGfx: Graphics | null = null;

	// Bounds for manual hit testing (in world space, set after positioning)
	worldX = 0;
	worldY = 0;
	hitWidth = 0;
	hitHeight = 0;
	flowerHeight = 0;

	onClick: ((entry: JournalEntry) => void) | null = null;

	constructor(entry: JournalEntry) {
		this.entry = entry;
		this.dna = generateFlowerDNA(entry.mood, entry.flowerSeed);
		this.container = new Container();

		// Random animation timing per flower (ensure positive values for negative seeds)
		this.animPhase = (((entry.flowerSeed % 1000) + 1000) % 1000) / 1000 * 100;
		this.animSpeed = 0.06 + (((entry.flowerSeed % 500) + 500) % 500) / 500 * 0.08;

		// Render base flower + animation frames
		const base = renderFlower(this.dna);

		for (let f = 0; f < ANIM_FRAMES; f++) {
			const frame = f === 0 ? base : renderFlowerFrame(base, f, entry.flowerSeed);
			this.textures.push(this.pixelsToTexture(frame.pixels, frame.width, frame.height));
		}

		this.sprite = new Sprite(this.textures[0]);
		this.sprite.scale.set(PIXEL_SCALE);
		this.sprite.anchor.set(0.5, 1);

		// Find actual top of visible pixels for accurate label placement & hitbox
		let topPixelY = 0;
		const px = base.pixels;
		const w = base.width;
		const h = base.height;
		for (let y = 0; y < h; y++) {
			let hasPixel = false;
			for (let x = 0; x < w; x++) {
				if (px[(y * w + x) * 4 + 3] > 0) { hasPixel = true; break; }
			}
			if (hasPixel) { topPixelY = y; break; }
		}
		// Height from bottom (anchor) to top visible pixel
		this.flowerHeight = (h - topPixelY) * PIXEL_SCALE;

		this.hitWidth = base.width * PIXEL_SCALE * 0.5;
		this.hitHeight = this.flowerHeight * 0.8;

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

		this.sparkleGfx.visible = false;
		this.container.addChild(this.sparkleGfx);
		this.container.addChild(this.sprite);
	}

	private pixelsToTexture(pixels: Uint8ClampedArray, w: number, h: number): Texture {
		// Upload raw RGBA pixel data directly to WebGL via BufferImageSource
		// This bypasses HTMLCanvasElement entirely, avoiding canvas GC issues
		const buffer = new Uint8Array(pixels.length);
		buffer.set(pixels);
		const source = new BufferImageSource({
			resource: buffer,
			width: w,
			height: h,
			format: 'rgba8unorm',
			scaleMode: 'nearest',
			resolution: 1,
			label: `flower-tex-${textureIdCounter++}`,
			autoGenerateMipmaps: false
		});
		return new Texture({ source });
	}

	setPosition(x: number, y: number) {
		this.worldX = x;
		this.worldY = y;
		this.container.position.set(x, y);
	}

	hitTest(wx: number, wy: number): boolean {
		const left = this.worldX - this.hitWidth / 2;
		// Anchor hitbox to actual visible flower, not the full sprite canvas
		const top = this.worldY - this.flowerHeight;
		const bottom = this.worldY;
		const hitTop = top + (this.flowerHeight - this.hitHeight) * 0.15;
		return wx >= left && wx <= left + this.hitWidth && wy >= hitTop && wy <= bottom;
	}

	setHover(hovered: boolean) {
		if (hovered === this.isHovered) return;
		this.isHovered = hovered;
		this.targetHoverScale = hovered ? 1.15 : 1;
	}

	/** Set up grow-in animation: starts hidden, grows after delay (seconds) */
	setGrowIn(delay: number) {
		this.growProgress = 0;
		this.growDelay = delay;
		this.growStarted = false;
		this.container.scale.set(0);
	}

	get isGrown(): boolean {
		return this.growProgress >= 1 && !this.shrinking;
	}

	/** Set up shrink-out animation: shrinks to 0 after delay (seconds) */
	setShrinkOut(delay: number) {
		this.shrinking = true;
		this.shrinkProgress = 0;
		this.shrinkDelay = delay;
		this.shrinkStarted = false;
	}

	get isShrunk(): boolean {
		return this.shrinking && this.shrinkProgress >= 1;
	}

	update(_dt: number) {
		this.hoverScale += (this.targetHoverScale - this.hoverScale) * 0.15;

		const time = performance.now() / 1000;

		// Shrink-out animation
		if (this.shrinking) {
			if (!this.shrinkStarted) {
				this.shrinkDelay -= _dt / 60;
				if (this.shrinkDelay <= 0) this.shrinkStarted = true;
				else return;
			}
			this.shrinkProgress = Math.min(1, this.shrinkProgress + 0.06);
			const t = 1 - this.shrinkProgress; // 1 → 0
			this.container.scale.set(t * t); // ease-in (accelerating shrink)
			return;
		}

		// Grow-in animation
		if (this.growProgress < 1) {
			if (!this.growStarted) {
				this.growDelay -= _dt / 60; // dt is in frames at 60fps
				if (this.growDelay <= 0) this.growStarted = true;
				else {
					this.container.scale.set(0);
					return;
				}
			}
			this.growProgress = Math.min(1, this.growProgress + 0.04);
			// Elastic ease-out
			const t = this.growProgress;
			const ease = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.5) : 1;
			this.container.scale.set(ease);
			return;
		}

		// Breathing — slower and subtler when sleeping
		const breathSpeed = 0.5 - this.sleepFactor * 0.25;
		const breathAmp = 0.018 - this.sleepFactor * 0.008;
		const breathe = 1 + Math.sin(time * breathSpeed + this.entry.flowerSeed * 0.7) * breathAmp;
		// Sleeping flowers gently close (scale down slightly based on bloom)
		const sleepScale = 1 - this.sleepFactor * this.dna.bloomState * 0.08;
		this.container.scale.set(this.hoverScale * breathe * this.bloomScale * sleepScale);

		// Sway + wind
		const swayAmount = 0.02 * (1 - this.dna.stemCurve * 0.5);
		this.container.rotation = Math.sin(time * 0.8 + this.entry.flowerSeed) * swayAmount + this.windLean;

		// Pixel animation frames (safe modulo to avoid negative indices)
		const rawFrame = (time * this.animSpeed + this.animPhase) % ANIM_FRAMES;
		const frameIdx = ((Math.floor(rawFrame) % ANIM_FRAMES) + ANIM_FRAMES) % ANIM_FRAMES;
		this.sprite.texture = this.textures[frameIdx];

		// Sparkle hover effect — fade in/out
		const targetAlpha = this.isHovered ? 1 : 0;
		this.sparkleAlpha += (targetAlpha - this.sparkleAlpha) * 0.12;

		this.sparkleGfx.clear();
		this.sparkleGfx.visible = this.sparkleAlpha > 0.01;
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

	/** Lazily create the anniversary sparkle graphics layer */
	ensureAnniversaryGfx() {
		if (this.anniversaryGfx) return;
		this.anniversaryGfx = new Graphics();
		this.container.addChild(this.anniversaryGfx);
	}

	forceTextureUpload(_renderer: Renderer) {
		// Force each texture source to mark itself as needing upload
		for (const tex of this.textures) {
			tex.source.update();
		}
	}

	destroy() {
		for (const t of this.textures) t.destroy(true);
		this.textures = [];
		this.container.destroy({ children: true });
	}
}
