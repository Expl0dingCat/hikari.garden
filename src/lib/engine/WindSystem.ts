/**
 * Global wind that all flowers and grass respond to together.
 * Wind direction slowly drifts; intensity varies with weather.
 */
export class WindSystem {
	private time = 0;
	private windAngle = 0;     // current wind direction in radians
	private windStrength = 0;  // 0-1 intensity
	private targetStrength = 0.15;
	private gustTimer = 0;
	private gustActive = false;
	private gustStrength = 0;

	/** Set target wind intensity based on weather condition */
	setWeather(condition: string) {
		switch (condition) {
			case 'storm':
				this.targetStrength = 0.7;
				break;
			case 'showers':
			case 'rain':
				this.targetStrength = 0.4;
				break;
			case 'drizzle':
				this.targetStrength = 0.25;
				break;
			case 'snow':
				this.targetStrength = 0.1;
				break;
			default:
				this.targetStrength = 0.15;
		}
	}

	update(dt: number) {
		this.time += dt;

		// Slowly drift wind direction
		this.windAngle = Math.sin(this.time * 0.003) * 0.8 + Math.sin(this.time * 0.0011) * 0.4;

		// Smooth strength toward target
		this.windStrength += (this.targetStrength - this.windStrength) * 0.002;

		// Occasional gusts (every 30-60 seconds)
		this.gustTimer -= dt;
		if (this.gustTimer <= 0 && !this.gustActive) {
			this.gustTimer = 1800 + Math.random() * 1800; // 30-60s at 60fps
			this.gustActive = true;
			this.gustStrength = 0;
		}

		if (this.gustActive) {
			this.gustStrength += 0.02;
			if (this.gustStrength > 1) {
				this.gustActive = false;
			}
		} else {
			this.gustStrength *= 0.97;
		}
	}

	/** Force a wind gust (for debug) */
	forceGust() {
		this.gustActive = true;
		this.gustStrength = 0;
		this.windStrength = Math.max(this.windStrength, 0.5);
	}

	/** Get current wind lean angle for a flower of given stem height */
	getFlowerLean(stemHeight: number): number {
		const heightFactor = Math.min(1, stemHeight / 24);
		const baseWind = Math.sin(this.windAngle) * this.windStrength * 0.04;
		const gust = this.gustActive
			? Math.sin(this.gustStrength * Math.PI) * this.windStrength * 0.06
			: this.gustStrength * this.windStrength * 0.02;
		return (baseWind + gust) * heightFactor;
	}

	/** Get wind offset for grass wobble */
	getGrassWind(): number {
		const baseWind = Math.sin(this.windAngle) * this.windStrength;
		const gust = this.gustActive
			? Math.sin(this.gustStrength * Math.PI) * this.windStrength * 0.5
			: 0;
		return (baseWind + gust) * 0.3;
	}
}
