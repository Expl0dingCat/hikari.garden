import { Application, Container, Graphics } from 'pixi.js';
import type { JournalEntry } from '$lib/types.js';
import { FlowerSprite } from './FlowerSprite.js';
import { ParticleSystem } from './ParticleSystem.js';
import { GrassSystem } from './GrassSystem.js';
import { calculateSpiralPositions, getGardenBounds } from './SpiralLayout.js';
import { Camera } from './Camera.js';
import { getBlendedTheme, type TimeTheme } from './TimeOfDay.js';
import { generateCursors, type CursorSet } from './Cursors.js';
import { WeatherSystem, fetchWeatherCondition } from './WeatherSystem.js';
import { ShootingStars } from './ShootingStars.js';
import { KonamiCode } from './KonamiCode.js';
import { PetalRain } from './PetalRain.js';
import { MidnightBloom } from './MidnightBloom.js';
import { TitleWave } from './TitleWave.js';
import { IdleVisitors } from './IdleVisitors.js';
import { cursorDefault, cursorPointer } from '$lib/stores/garden.js';

export class GardenEngine {
	private app: Application;
	private world: Container;
	private flowers: FlowerSprite[] = [];
	private particles: ParticleSystem;
	private grass: GrassSystem;
	private weather: WeatherSystem;
	private camera: Camera;
	private background: Graphics;
	private theme: TimeTheme;
	private themeUpdateTimer = 0;
	private todayFlowers: FlowerSprite[] = [];
	private todayStr = '';
	private latestFlower: FlowerSprite | null = null;
	private growInActive = false;
	private growInTimer = 0;
	private shrinkOutActive = false;
	deepLinkFlowerId: string | null = null;
	private pendingEntries: JournalEntry[] | null = null;
	private shootingStars: ShootingStars;
	private konamiCode!: KonamiCode;
	private petalRain: PetalRain;
	private midnightBloom: MidnightBloom;
	private titleWave: TitleWave;
	private idleVisitors: IdleVisitors;
	private canvas!: HTMLCanvasElement;
	private cursors!: CursorSet;

	onFlowerClick: ((entry: JournalEntry) => void) | null = null;
	onFlowerHover: ((entry: JournalEntry | null, screenX: number, screenY: number) => void) | null = null;
	onTodayFlowers: ((positions: { entry: JournalEntry; x: number; y: number }[]) => void) | null = null;
	onLatestFlower: ((pos: { entry: JournalEntry; x: number; y: number } | null) => void) | null = null;

	constructor() {
		this.app = new Application();
		this.world = new Container();
		this.background = new Graphics();
		this.particles = new ParticleSystem();
		this.grass = new GrassSystem();
		this.weather = new WeatherSystem();
		this.shootingStars = new ShootingStars();
		this.petalRain = new PetalRain();
		this.midnightBloom = new MidnightBloom();
		this.titleWave = new TitleWave();
		this.idleVisitors = new IdleVisitors();
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

		// Scene graph: background -> world (grass, flowers, idleVisitors, particles) -> shootingStars -> petalRain -> weather
		this.app.stage.addChild(this.background);
		this.app.stage.addChild(this.world);
		this.app.stage.addChild(this.shootingStars.gfx);
		this.app.stage.addChild(this.petalRain.gfx);
		this.app.stage.addChild(this.weather.container);

		this.world.sortableChildren = true;
		this.world.addChild(this.grass.container);
		this.grass.container.zIndex = -10000;
		this.world.addChild(this.midnightBloom.container);
		this.midnightBloom.container.zIndex = 4000;
		this.world.addChild(this.idleVisitors.container);
		this.idleVisitors.container.zIndex = 5000;
		this.world.addChild(this.particles.container);
		this.particles.container.zIndex = 10000;

		// Manual click + hover detection on canvas
		canvas.addEventListener('click', this.handleClick);
		canvas.addEventListener('pointermove', this.handleHover);

		// Render loop
		this.app.ticker.add((ticker) => this.update(ticker.deltaTime));

		this.updateTheme();

		// Konami code → petal rain + midnight bloom
		this.konamiCode = new KonamiCode(() => {
			this.petalRain.setScreenSize(this.app.screen.width, this.app.screen.height);
			this.petalRain.trigger(this.flowers);
			this.midnightBloom.trigger(10);
		});

		// Fetch and apply current weather
		this.weather.setScreenSize(this.app.screen.width, this.app.screen.height);
		fetchWeatherCondition().then((condition) => {
			this.weather.setCondition(condition);
		});
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

	private worldToScreen(wx: number, wy: number): { x: number; y: number } {
		const cx = this.app.screen.width / 2;
		const cy = this.app.screen.height / 2;
		return {
			x: (wx + this.camera.x) * this.camera.zoom + cx,
			y: (wy + this.camera.y) * this.camera.zoom + cy
		};
	}

	private handleClick = (e: MouseEvent) => {
		this.idleVisitors.resetIdle();
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

	private lastHoveredEntry: JournalEntry | null = null;

	private handleHover = (e: PointerEvent) => {
		this.idleVisitors.resetIdle();
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

		const hoveredEntry = hoveredFlower?.entry ?? null;
		if (hoveredEntry !== this.lastHoveredEntry || hoveredEntry) {
			this.lastHoveredEntry = hoveredEntry;
			const rect = this.canvas.getBoundingClientRect();
			this.onFlowerHover?.(hoveredEntry, e.clientX - rect.left, e.clientY - rect.top);
		}
	};

	/** Update entry data references without re-rendering (e.g. smell count changes) */
	updateEntryData(entries: JournalEntry[]) {
		const byId = new Map(entries.map((e) => [e.id, e]));
		for (const flower of this.flowers) {
			const updated = byId.get(flower.entry.id);
			if (updated) flower.entry = updated;
		}
	}

	/** Shrink out current flowers, then load new entries with grow-in */
	transitionEntries(entries: JournalEntry[]) {
		if (this.flowers.length === 0) {
			this.loadEntries(entries);
			return;
		}

		// Cancel any ongoing grow-in
		this.growInActive = false;

		// Scatter any idle visitors
		this.idleVisitors.resetIdle();

		// Stagger shrink from outside-in (outermost flowers shrink first)
		const n = this.flowers.length;
		const totalShrinkDuration = Math.min(n * 0.03, 1);
		for (let i = 0; i < n; i++) {
			const delay = ((n - 1 - i) / Math.max(1, n - 1)) * totalShrinkDuration;
			this.flowers[i].setShrinkOut(delay);
		}

		// Shrink grass out too
		this.grass.shrinkOut();

		this.pendingEntries = entries;
		this.shrinkOutActive = true;
	}

	loadEntries(entries: JournalEntry[], skipGrowIn = false) {
		for (const f of this.flowers) f.destroy();
		this.flowers = [];
		this.todayFlowers = [];
		this.latestFlower = null;

		if (entries.length === 0) {
			this.grass.generate({ minX: 0, maxX: 0, minY: 0, maxY: 0 }, []);
			return;
		}

		const sorted = [...entries].sort((a, b) =>
			a.date.localeCompare(b.date) || a.createdAt - b.createdAt
		);
		const positions = calculateSpiralPositions(
			sorted.length,
			sorted.map((e) => e.date)
		);

		if (skipGrowIn) {
			// No grow-in animation — place all flowers fully grown
			for (let i = 0; i < sorted.length; i++) {
				const flower = new FlowerSprite(sorted[i]);
				flower.setPosition(positions[i].x, positions[i].y);
				flower.container.zIndex = positions[i].y;
				this.world.addChild(flower.container);
				this.flowers.push(flower);
			}
		} else {
			// Calculate stagger delay per flower (center-out grow-in)
			const totalGrowDuration = Math.min(sorted.length * 0.06, 3); // cap at 3s
			for (let i = 0; i < sorted.length; i++) {
				const flower = new FlowerSprite(sorted[i]);
				flower.setPosition(positions[i].x, positions[i].y);
				flower.container.zIndex = positions[i].y;
				const delay = (i / Math.max(1, sorted.length - 1)) * totalGrowDuration;
				flower.setGrowIn(delay);
				this.world.addChild(flower.container);
				this.flowers.push(flower);
			}
		}

		// Force all flower texture sources to upload to the GPU
		for (const flower of this.flowers) {
			flower.forceTextureUpload(this.app.renderer);
		}

		// Cache today's flowers and latest flower (use local date, not UTC)
		const now = new Date();
		this.todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		this.todayFlowers = this.flowers.filter((f) => f.entry.date === this.todayStr);
		this.latestFlower = this.flowers.length > 0 ? this.flowers[this.flowers.length - 1] : null;

		// Generate grass across the garden (skip when just adding a flower)
		if (!skipGrowIn) {
			const bounds = getGardenBounds(positions);
			this.grass.container.alpha = 1;
			this.grass.generate(bounds, positions);
		}

		if (skipGrowIn) {
			// Just pan to the newest flower
			this.growInActive = false;
			if (this.latestFlower) {
				this.camera.focusOn(this.latestFlower.worldX, this.latestFlower.worldY, 1.2);
			}
		} else if (this.deepLinkFlowerId) {
			// Deep link — start camera focused on the linked flower, skip grow-in pan
			const target = this.flowers.find((f) => f.entry.id === this.deepLinkFlowerId);
			if (target) {
				this.camera.focusOn(target.worldX, target.worldY, 1.2);
				this.camera.x = -target.worldX;
				this.camera.y = -target.worldY;
				this.camera.zoom = 1.2;
			}
			this.growInActive = true;
			this.growInTimer = 0;
		} else {
			// Start camera at center (0,0) during grow-in, then pan to newest
			this.camera.focusOn(0, 0, 0.8);
			this.camera.x = 0;
			this.camera.y = 0;
			this.camera.zoom = 0.8;
			this.growInActive = true;
			this.growInTimer = 0;
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

		// Easter egg systems
		this.idleVisitors.update(dt, this.flowers);
		this.midnightBloom.update(dt);
		this.titleWave.update(dt, this.flowers);

		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;
		this.shootingStars.setScreenSize(screenW, screenH);
		this.shootingStars.update(dt);
		this.petalRain.setScreenSize(screenW, screenH);
		this.petalRain.update(dt);

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
		this.weather.setScreenSize(this.app.screen.width, this.app.screen.height);
		this.weather.update(dt);

		// Shrink-out → wait for flowers + grass to finish, then load pending entries
		if (this.shrinkOutActive) {
			if (this.flowers.every((f) => f.isShrunk) && this.grass.allShrunk) {
				this.shrinkOutActive = false;
				const pending = this.pendingEntries;
				this.pendingEntries = null;
				if (pending) {
					this.loadEntries(pending);
				}
			}
		}

		// Grow-in → pause → camera pan to latest (skip if deep linked)
		if (this.growInActive) {
			this.growInTimer += dt / 60; // seconds
			const totalGrow = Math.min(this.flowers.length * 0.06, 3);
			if (this.growInTimer > totalGrow + 1.5) {
				this.growInActive = false;
				if (!this.deepLinkFlowerId && this.latestFlower && !this.camera.userInteracted) {
					this.camera.focusOn(this.latestFlower.worldX, this.latestFlower.worldY, 1.2);
				}
				this.deepLinkFlowerId = null;
			}
		}

		// Emit today's flower screen positions — only for flowers that have finished growing
		if (this.onTodayFlowers) {
			const positions = this.todayFlowers
				.filter((f) => f.isGrown)
				.map((f) => {
					const topY = f.worldY - f.flowerHeight;
					const sp = this.worldToScreen(f.worldX, topY);
					return { entry: f.entry, x: sp.x, y: sp.y };
				});
			this.onTodayFlowers(positions);
		}

		// Emit latest flower position — only if grown
		if (this.onLatestFlower) {
			if (this.latestFlower?.isGrown) {
				const f = this.latestFlower;
				const topY = f.worldY - f.flowerHeight;
				const sp = this.worldToScreen(f.worldX, topY);
				this.onLatestFlower({ entry: f.entry, x: sp.x, y: sp.y });
			} else {
				this.onLatestFlower(null);
			}
		}

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

	triggerTitleWave() {
		if (this.growInActive || this.shrinkOutActive) return;
		this.titleWave.trigger(this.flowers);
	}

	centerOnFlower(id: string) {
		const f = this.flowers.find((fl) => fl.entry.id === id);
		if (f) {
			this.camera.focusOn(f.worldX, f.worldY, 1.2);
		}
	}

	resize() {
		this.app.resize();
	}

	destroy() {
		this.canvas.removeEventListener('click', this.handleClick);
		this.canvas.removeEventListener('pointermove', this.handleHover);
		this.camera.destroy();
		this.konamiCode.destroy();
		for (const f of this.flowers) f.destroy();
		this.grass.destroy();
		this.particles.destroy();
		this.weather.destroy();
		this.shootingStars.destroy();
		this.petalRain.destroy();
		this.midnightBloom.destroy();
		this.idleVisitors.destroy();
		this.app.destroy(true);
	}
}
