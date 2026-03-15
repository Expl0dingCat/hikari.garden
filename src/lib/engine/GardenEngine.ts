import { Application, Container, Graphics } from 'pixi.js';
import type { JournalEntry } from '$lib/types.js';
import { FlowerSprite } from './FlowerSprite.js';
import { ParticleSystem } from './ParticleSystem.js';
import { GrassSystem } from './GrassSystem.js';
import { calculateSpiralPositions, getGardenBounds } from './SpiralLayout.js';
import { Camera } from './Camera.js';
import { getBlendedTheme, type TimeTheme } from './TimeOfDay.js';
import { generateCursors, type CursorSet } from './Cursors.js';
import { cursorDefault, cursorPointer } from '$lib/stores/garden.js';

export class GardenEngine {
	private app: Application;
	private world: Container;
	private flowers: FlowerSprite[] = [];
	private particles: ParticleSystem;
	private grass: GrassSystem;
	private camera: Camera;
	private background: Graphics;
	private theme: TimeTheme;
	private themeUpdateTimer = 0;
	private canvas!: HTMLCanvasElement;
	private cursors!: CursorSet;

	onFlowerClick: ((entry: JournalEntry) => void) | null = null;

	constructor() {
		this.app = new Application();
		this.world = new Container();
		this.background = new Graphics();
		this.particles = new ParticleSystem();
		this.grass = new GrassSystem();
		this.theme = getBlendedTheme();
		this.camera = null!;
	}

	async init(canvas: HTMLCanvasElement) {
		this.canvas = canvas;

		await this.app.init({
			canvas,
			resizeTo: canvas.parentElement ?? window,
			antialias: false,
			backgroundColor: this.theme.bgColor,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true
		});

		this.camera = new Camera(canvas, () => {});
		this.cursors = generateCursors();
		this.camera.setCursorProvider((type) =>
			type === 'grabbing' ? this.cursors.grabbing : this.cursors.default
		);
		canvas.style.cursor = this.cursors.default;

		// Expose cursors globally so UI overlays use them too
		cursorDefault.set(this.cursors.default);
		cursorPointer.set(this.cursors.pointer);

		// Scene graph: background -> grass -> particles -> flowers
		this.app.stage.addChild(this.background);
		this.app.stage.addChild(this.world);

		this.world.addChild(this.grass.container);
		this.world.addChild(this.particles.container);

		// Manual click + hover detection on canvas
		canvas.addEventListener('click', this.handleClick);
		canvas.addEventListener('pointermove', this.handleHover);

		// Render loop
		this.app.ticker.add((ticker) => this.update(ticker.deltaTime));

		this.updateTheme();
	}

	private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();
		const cx = rect.width / 2;
		const cy = rect.height / 2;
		return {
			x: (screenX - rect.left - cx) / this.camera.zoom - this.camera.x,
			y: (screenY - rect.top - cy) / this.camera.zoom - this.camera.y
		};
	}

	private handleClick = (e: MouseEvent) => {
		if (this.camera.wasDrag()) return;

		const world = this.screenToWorld(e.clientX, e.clientY);

		// Check flowers in reverse order (top-most first)
		for (let i = this.flowers.length - 1; i >= 0; i--) {
			if (this.flowers[i].hitTest(world.x, world.y)) {
				this.onFlowerClick?.(this.flowers[i].entry);
				return;
			}
		}
	};

	private handleHover = (e: PointerEvent) => {
		const world = this.screenToWorld(e.clientX, e.clientY);

		// Find only the top-most hit flower
		let hoveredFlower: FlowerSprite | null = null;
		for (let i = this.flowers.length - 1; i >= 0; i--) {
			if (this.flowers[i].hitTest(world.x, world.y)) {
				hoveredFlower = this.flowers[i];
				break;
			}
		}

		for (const flower of this.flowers) {
			flower.setHover(flower === hoveredFlower);
		}

		this.canvas.style.cursor = this.camera.wasDrag()
			? this.cursors.grabbing
			: hoveredFlower
				? this.cursors.pointer
				: this.cursors.default;
	};

	loadEntries(entries: JournalEntry[]) {
		for (const f of this.flowers) f.destroy();
		this.flowers = [];

		if (entries.length === 0) return;

		const sorted = [...entries].sort((a, b) =>
			a.date.localeCompare(b.date) || a.createdAt - b.createdAt
		);
		const positions = calculateSpiralPositions(
			sorted.length,
			sorted.map((e) => e.date)
		);

		for (let i = 0; i < sorted.length; i++) {
			const flower = new FlowerSprite(sorted[i]);
			flower.setPosition(positions[i].x, positions[i].y);
			this.world.addChild(flower.container);
			this.flowers.push(flower);
		}

		// Generate grass across the garden
		const bounds = getGardenBounds(positions);
		this.grass.generate(bounds, positions);

		// Focus camera on newest flower
		if (positions.length > 0) {
			const newest = positions[positions.length - 1];
			this.camera.focusOn(newest.x, newest.y, 1.2);
		}

		this.particles.setBounds(
			this.app.screen.width / this.camera.zoom,
			this.app.screen.height / this.camera.zoom
		);
	}

	private update(dt: number) {
		this.camera.update();
		const cx = this.app.screen.width / 2;
		const cy = this.app.screen.height / 2;
		this.world.position.set(
			cx + this.camera.x * this.camera.zoom,
			cy + this.camera.y * this.camera.zoom
		);
		this.world.scale.set(this.camera.zoom);

		for (const flower of this.flowers) {
			flower.update(dt);
		}

		const vw = this.app.screen.width / this.camera.zoom;
		const vh = this.app.screen.height / this.camera.zoom;
		const viewBounds = {
			left: -this.camera.x - vw / 2,
			right: -this.camera.x + vw / 2,
			top: -this.camera.y - vh / 2,
			bottom: -this.camera.y + vh / 2
		};
		this.grass.update(dt, this.camera.zoom, viewBounds);
		this.particles.update(dt);

		this.themeUpdateTimer += dt;
		if (this.themeUpdateTimer > 60) {
			this.themeUpdateTimer = 0;
			this.updateTheme();
		}
	}

	private updateTheme() {
		this.theme = getBlendedTheme();
		this.app.renderer.background.color = this.theme.bgColor;

		const particleColorNum = parseInt(this.theme.particleColor.slice(1), 16);
		this.particles.setTheme(particleColorNum, this.theme.ambientAlpha);

	}

	resize() {
		this.app.resize();
	}

	destroy() {
		this.canvas.removeEventListener('click', this.handleClick);
		this.canvas.removeEventListener('pointermove', this.handleHover);
		this.camera.destroy();
		for (const f of this.flowers) f.destroy();
		this.grass.destroy();
		this.particles.destroy();
		this.app.destroy(true);
	}
}
