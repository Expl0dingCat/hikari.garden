import { Container, Graphics } from 'pixi.js';

export type WeatherCondition = 'clear' | 'drizzle' | 'rain' | 'showers' | 'snow' | 'storm';

interface WeatherParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	length: number; // for rain lines
	size: number; // for snow dots
	alpha: number;
	life: number;
	maxLife: number;
}

interface WeatherConfig {
	spawnRate: number;
	maxParticles: number;
	color: number;
	alpha: number;
	minVy: number;
	maxVy: number;
	wind: number;
	lineLength: number;
	minSize: number;
	maxSize: number;
	maxLife: number;
}

const CONFIGS: Record<WeatherCondition, WeatherConfig> = {
	clear: {
		spawnRate: 0, maxParticles: 0, color: 0xffffff, alpha: 0,
		minVy: 0, maxVy: 0, wind: 0, lineLength: 0, minSize: 0, maxSize: 0, maxLife: 0
	},
	drizzle: {
		spawnRate: 0.8, maxParticles: 80, color: 0xb0c4de, alpha: 0.25,
		minVy: 3, maxVy: 5, wind: 0.5, lineLength: 6, minSize: 1, maxSize: 1, maxLife: 200
	},
	rain: {
		spawnRate: 2.5, maxParticles: 200, color: 0x8faabe, alpha: 0.3,
		minVy: 6, maxVy: 10, wind: 1.0, lineLength: 10, minSize: 1, maxSize: 1.5, maxLife: 150
	},
	showers: {
		spawnRate: 3.5, maxParticles: 300, color: 0x7a99b2, alpha: 0.35,
		minVy: 8, maxVy: 13, wind: 1.5, lineLength: 14, minSize: 1, maxSize: 1.5, maxLife: 120
	},
	snow: {
		spawnRate: 0.6, maxParticles: 100, color: 0xf0f4f8, alpha: 0.6,
		minVy: 0.5, maxVy: 1.5, wind: 0.8, lineLength: 0, minSize: 2, maxSize: 4, maxLife: 500
	},
	storm: {
		spawnRate: 4, maxParticles: 250, color: 0x6080a0, alpha: 0.4,
		minVy: 10, maxVy: 16, wind: 2.5, lineLength: 18, minSize: 1, maxSize: 2, maxLife: 100
	}
};

export class WeatherSystem {
	container: Container;
	private gfx: Graphics;
	private particles: WeatherParticle[] = [];
	private condition: WeatherCondition = 'clear';
	private config = CONFIGS.clear;
	private spawnTimer = 0;
	private screenW = 800;
	private screenH = 600;
	private windPhase = Math.random() * 100;
	private lightningAlpha = 0;
	private lightningTimer = 0;

	constructor() {
		this.container = new Container();
		this.gfx = new Graphics();
		this.container.addChild(this.gfx);
	}

	setCondition(condition: WeatherCondition) {
		if (condition === this.condition) return;
		this.condition = condition;
		this.config = CONFIGS[condition];
		this.particles = [];
	}

	setScreenSize(w: number, h: number) {
		this.screenW = w;
		this.screenH = h;
	}

	private spawn() {
		const cfg = this.config;
		const isLine = cfg.lineLength > 0;

		const p: WeatherParticle = {
			x: Math.random() * (this.screenW + 200) - 100,
			y: -20 - Math.random() * 60,
			vx: cfg.wind * (0.5 + Math.random() * 0.5),
			vy: cfg.minVy + Math.random() * (cfg.maxVy - cfg.minVy),
			length: isLine ? cfg.lineLength * (0.7 + Math.random() * 0.6) : 0,
			size: cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize),
			alpha: cfg.alpha * (0.6 + Math.random() * 0.4),
			life: 0,
			maxLife: cfg.maxLife * (0.7 + Math.random() * 0.6)
		};

		this.particles.push(p);
	}

	update(dt: number) {
		const cfg = this.config;
		if (cfg.spawnRate === 0) {
			if (this.particles.length > 0) this.particles.length = 0;
			this.gfx.clear();
			return;
		}

		const time = performance.now() / 1000;

		// Spawn
		this.spawnTimer += cfg.spawnRate * dt;
		while (this.spawnTimer >= 1 && this.particles.length < cfg.maxParticles) {
			this.spawn();
			this.spawnTimer--;
		}

		// Lightning for storms — very rare, once every ~90-150 seconds
		if (this.condition === 'storm') {
			this.lightningTimer -= dt / 60;
			if (this.lightningTimer <= 0) {
				this.lightningAlpha = 0.12 + Math.random() * 0.08;
				this.lightningTimer = 90 + Math.random() * 60;
			}
			this.lightningAlpha *= 0.92;
		} else {
			this.lightningAlpha = 0;
		}

		// Global wind sway
		const windSway = Math.sin(time * 0.3 + this.windPhase) * 0.3;
		const isSnow = this.condition === 'snow';
		const screenH = this.screenH;
		const screenW = this.screenW;

		// Update particles — swap-remove instead of splice
		let len = this.particles.length;
		for (let i = len - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life += dt;
			p.x += (p.vx + windSway) * dt;
			p.y += p.vy * dt;

			if (isSnow) {
				p.x += Math.sin(time * 1.5 + p.y * 0.02 + i) * 0.3 * dt;
			}

			if (p.y > screenH + 30 || p.x > screenW + 100 || p.life >= p.maxLife) {
				// Swap with last and pop
				this.particles[i] = this.particles[len - 1];
				len--;
			}
		}
		this.particles.length = len;

		// Draw — batch all lines into one stroke, all dots into one fill
		this.gfx.clear();

		if (this.lightningAlpha > 0.01) {
			this.gfx.rect(0, 0, screenW, screenH);
			this.gfx.fill({ color: 0xd0d8ff, alpha: this.lightningAlpha });
		}

		const isLine = cfg.lineLength > 0;

		if (isLine) {
			// Batch all rain lines into a single stroke call
			for (let i = 0; i < this.particles.length; i++) {
				const p = this.particles[i];
				const angle = Math.atan2(p.vy, p.vx + windSway);
				this.gfx.moveTo(p.x, p.y);
				this.gfx.lineTo(p.x + Math.cos(angle) * p.length, p.y + Math.sin(angle) * p.length);
			}
			this.gfx.stroke({ color: cfg.color, alpha: cfg.alpha, width: 1 });
		} else {
			// Batch all snow dots into a single fill call
			for (let i = 0; i < this.particles.length; i++) {
				const p = this.particles[i];
				const lifeRatio = p.life / p.maxLife;
				let alpha = p.alpha;
				if (lifeRatio < 0.05) alpha *= lifeRatio / 0.05;
				else if (lifeRatio > 0.85) alpha *= (1 - lifeRatio) / 0.15;
				this.gfx.circle(p.x, p.y, p.size);
				this.gfx.fill({ color: cfg.color, alpha });
			}
		}
	}

	destroy() {
		this.gfx.destroy();
		this.container.destroy({ children: true });
	}
}

/** Fetch current weather condition via IP-based geolocation (no browser prompt) */
export async function fetchWeatherCondition(): Promise<WeatherCondition> {
	try {
		const geo = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
		if (!geo.ok) return 'clear';
		const geoData = await geo.json();
		const lat = geoData.latitude, lon = geoData.longitude;

		const weather = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`,
			{ signal: AbortSignal.timeout(5000) }
		);
		if (!weather.ok) return 'clear';
		const data = await weather.json();
		return weatherCodeToCondition(data.current.weather_code as number);
	} catch {
		return 'clear';
	}
}

function weatherCodeToCondition(code: number): WeatherCondition {
	if (code === 0) return 'clear';
	if (code <= 3) return 'clear';
	if (code <= 48) return 'clear'; // cloudy/fog → no effect
	if (code <= 57) return 'drizzle';
	if (code <= 67) return 'rain';
	if (code <= 77) return 'snow';
	if (code <= 82) return 'showers';
	if (code <= 86) return 'snow';
	if (code >= 95) return 'storm';
	return 'clear';
}
