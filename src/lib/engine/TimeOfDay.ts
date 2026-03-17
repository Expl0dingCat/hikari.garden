export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface TimeTheme {
	phase: TimePhase;
	bgColor: number;
	bgGradientTop: string;
	bgGradientBottom: string;
	flowerGlow: number; // 0–1
	particleColor: string;
	ambientAlpha: number;
}

const themes: Record<TimePhase, TimeTheme> = {
	dawn: {
		phase: 'dawn',
		bgColor: 0xffecd2,
		bgGradientTop: '#ffecd2',
		bgGradientBottom: '#fcb69f',
		flowerGlow: 0.15,
		particleColor: '#ffcc80',
		ambientAlpha: 0.4
	},
	day: {
		phase: 'day',
		bgColor: 0xf0f4f0,
		bgGradientTop: '#e8f5e9',
		bgGradientBottom: '#f1f8e9',
		flowerGlow: 0,
		particleColor: '#c8e6c9',
		ambientAlpha: 0.3
	},
	dusk: {
		phase: 'dusk',
		bgColor: 0xd1c4e9,
		bgGradientTop: '#ce93d8',
		bgGradientBottom: '#5c6bc0',
		flowerGlow: 0.3,
		particleColor: '#e1bee7',
		ambientAlpha: 0.5
	},
	night: {
		phase: 'night',
		bgColor: 0x1a1a2e,
		bgGradientTop: '#0d1b2a',
		bgGradientBottom: '#1b2838',
		flowerGlow: 0.7,
		particleColor: '#80cbc4',
		ambientAlpha: 0.6
	}
};

export function getTimePhase(hour?: number): TimePhase {
	const h = hour ?? new Date().getHours();
	if (h >= 5 && h < 8) return 'dawn';
	if (h >= 8 && h < 17) return 'day';
	if (h >= 17 && h < 20) return 'dusk';
	return 'night';
}

export function getTimeTheme(hour?: number): TimeTheme {
	return themes[getTimePhase(hour)];
}

function lerpNum(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpHexColor(a: number, b: number, t: number): number {
	const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
	const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
	const r = Math.round(lerpNum(ar, br, t));
	const g = Math.round(lerpNum(ag, bg, t));
	const b2 = Math.round(lerpNum(ab, bb, t));
	return (r << 16) | (g << 8) | b2;
}

function lerpColor(a: string, b: string, t: number): string {
	// Parse rgba() or rgb() strings
	const parseRGBA = (s: string): [number, number, number, number] => {
		const m = s.match(/[\d.]+/g);
		if (!m) return [0, 0, 0, 1];
		return [+m[0], +m[1], +m[2], m[3] !== undefined ? +m[3] : 1];
	};
	const parseHex = (s: string): [number, number, number, number] => {
		const hex = s.replace('#', '');
		return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
	};
	const [ar, ag, ab, aa] = a.startsWith('#') ? parseHex(a) : parseRGBA(a);
	const [br, bg, bb, ba] = b.startsWith('#') ? parseHex(b) : parseRGBA(b);
	const r = Math.round(lerpNum(ar, br, t));
	const g = Math.round(lerpNum(ag, bg, t));
	const bl = Math.round(lerpNum(ab, bb, t));
	const al = Math.round((lerpNum(aa, ba, t)) * 100) / 100;
	if (al >= 1) return `rgb(${r}, ${g}, ${bl})`;
	return `rgba(${r}, ${g}, ${bl}, ${al})`;
}

/** CSS custom properties for the floating overlay UI (site name, buttons, month picker).
 *  Smoothly blends between phases so text remains readable during transitions. */
export function getOverlayThemeStyle(): string {
	type OverlayVars = {
		'overlay-text': string;
		'overlay-text-shadow': string;
		'overlay-btn-bg': string;
		'overlay-btn-hover': string;
		'overlay-btn-ghost-hover': string;
		'overlay-month-text': string;
		'overlay-month-bg': string;
		'overlay-arrow': string;
		'overlay-arrow-hover-bg': string;
		'overlay-arrow-hover': string;
		'overlay-welcome': string;
		'overlay-welcome-shadow': string;
		'overlay-empty': string;
	};

	const overlayThemes: Record<TimePhase, OverlayVars> = {
		night: {
			'overlay-text': 'rgba(255, 255, 255, 0.7)',
			'overlay-text-shadow': '0 1px 8px rgba(0, 0, 0, 0.3)',
			'overlay-btn-bg': 'rgba(255, 255, 255, 0.15)',
			'overlay-btn-hover': 'rgba(255, 255, 255, 0.25)',
			'overlay-btn-ghost-hover': 'rgba(255, 255, 255, 0.1)',
			'overlay-month-text': 'rgba(255, 255, 255, 0.8)',
			'overlay-month-bg': 'rgba(255, 255, 255, 0.1)',
			'overlay-arrow': 'rgba(255, 255, 255, 0.6)',
			'overlay-arrow-hover-bg': 'rgba(255, 255, 255, 0.15)',
			'overlay-arrow-hover': 'rgba(255, 255, 255, 0.9)',
			'overlay-welcome': 'rgba(255, 255, 255, 0.85)',
			'overlay-welcome-shadow': '0 0 30px rgba(255, 255, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.4)',
			'overlay-empty': 'rgba(255, 255, 255, 0.4)',
		},
		dawn: {
			'overlay-text': 'rgba(100, 60, 30, 0.6)',
			'overlay-text-shadow': 'none',
			'overlay-btn-bg': 'rgba(100, 60, 20, 0.08)',
			'overlay-btn-hover': 'rgba(100, 60, 20, 0.14)',
			'overlay-btn-ghost-hover': 'rgba(100, 60, 20, 0.08)',
			'overlay-month-text': 'rgba(100, 60, 30, 0.7)',
			'overlay-month-bg': 'rgba(100, 60, 20, 0.08)',
			'overlay-arrow': 'rgba(100, 60, 30, 0.5)',
			'overlay-arrow-hover-bg': 'rgba(100, 60, 20, 0.1)',
			'overlay-arrow-hover': 'rgba(100, 60, 30, 0.8)',
			'overlay-welcome': 'rgba(100, 60, 30, 0.7)',
			'overlay-welcome-shadow': '0 1px 8px rgba(255, 245, 230, 0.4)',
			'overlay-empty': 'rgba(100, 60, 30, 0.4)',
		},
		day: {
			'overlay-text': 'rgba(40, 60, 40, 0.55)',
			'overlay-text-shadow': 'none',
			'overlay-btn-bg': 'rgba(0, 0, 0, 0.06)',
			'overlay-btn-hover': 'rgba(0, 0, 0, 0.1)',
			'overlay-btn-ghost-hover': 'rgba(0, 0, 0, 0.06)',
			'overlay-month-text': 'rgba(40, 60, 40, 0.65)',
			'overlay-month-bg': 'rgba(0, 0, 0, 0.05)',
			'overlay-arrow': 'rgba(40, 60, 40, 0.5)',
			'overlay-arrow-hover-bg': 'rgba(0, 0, 0, 0.06)',
			'overlay-arrow-hover': 'rgba(40, 60, 40, 0.8)',
			'overlay-welcome': 'rgba(40, 60, 40, 0.65)',
			'overlay-welcome-shadow': '0 1px 8px rgba(255, 255, 255, 0.5)',
			'overlay-empty': 'rgba(40, 60, 40, 0.35)',
		},
		dusk: {
			'overlay-text': 'rgba(255, 255, 255, 0.7)',
			'overlay-text-shadow': '0 1px 8px rgba(0, 0, 0, 0.3)',
			'overlay-btn-bg': 'rgba(255, 255, 255, 0.15)',
			'overlay-btn-hover': 'rgba(255, 255, 255, 0.25)',
			'overlay-btn-ghost-hover': 'rgba(255, 255, 255, 0.1)',
			'overlay-month-text': 'rgba(255, 255, 255, 0.8)',
			'overlay-month-bg': 'rgba(255, 255, 255, 0.1)',
			'overlay-arrow': 'rgba(255, 255, 255, 0.6)',
			'overlay-arrow-hover-bg': 'rgba(255, 255, 255, 0.15)',
			'overlay-arrow-hover': 'rgba(255, 255, 255, 0.9)',
			'overlay-welcome': 'rgba(255, 255, 255, 0.85)',
			'overlay-welcome-shadow': '0 0 30px rgba(255, 255, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.4)',
			'overlay-empty': 'rgba(255, 255, 255, 0.4)',
		},
	};

	const h = new Date().getHours();
	const m = new Date().getMinutes();
	const fh = h + m / 60;

	// Phase boundaries: dawn 5-8, day 8-17, dusk 17-20, night 20-5
	// Blend during last hour of each phase
	const transitions: { start: number; end: number; from: TimePhase; to: TimePhase }[] = [
		{ start: 7, end: 8, from: 'dawn', to: 'day' },
		{ start: 16, end: 17, from: 'day', to: 'dusk' },
		{ start: 19, end: 20, from: 'dusk', to: 'night' },
		{ start: 4, end: 5, from: 'night', to: 'dawn' },
	];

	let fromPhase: TimePhase = getTimePhase(h);
	let toPhase: TimePhase = fromPhase;
	let t = 0;

	for (const tr of transitions) {
		if (fh >= tr.start && fh < tr.end) {
			fromPhase = tr.from;
			toPhase = tr.to;
			t = (fh - tr.start) / (tr.end - tr.start);
			break;
		}
	}

	const from = overlayThemes[fromPhase];
	const to = overlayThemes[toPhase];

	if (t === 0 || fromPhase === toPhase) {
		return Object.entries(from).map(([k, v]) => `--${k}:${v}`).join(';');
	}

	// Blend color values, pass non-color values from target when t > 0.5
	const result: string[] = [];
	for (const key of Object.keys(from) as (keyof OverlayVars)[]) {
		const fv = from[key];
		const tv = to[key];
		if (key.includes('shadow')) {
			// Shadows can't be lerped easily — crossfade by picking based on t
			result.push(`--${key}:${t < 0.5 ? fv : tv}`);
		} else {
			result.push(`--${key}:${lerpColor(fv, tv, t)}`);
		}
	}
	return result.join(';');
}

// Smooth transition between phases (for real-time updates)
/** CSS custom properties for UI panels, reactive to time of day */
export function getUIThemeStyle(): string {
	const phase = getTimePhase();
	const vars: Record<TimePhase, Record<string, string>> = {
		dawn: {
			'ui-card': 'rgba(255, 245, 232, 0.92)',
			'ui-card-border': 'rgba(220, 160, 100, 0.2)',
			'ui-shadow': '0 20px 60px rgba(150, 80, 30, 0.2)',
			'ui-text': '#4a3520',
			'ui-text-soft': '#7a5a3a',
			'ui-text-muted': 'rgba(120, 80, 40, 0.45)',
			'ui-input': 'rgba(255, 248, 238, 0.5)',
			'ui-input-border': 'rgba(200, 150, 100, 0.2)',
			'ui-input-focus': 'rgba(230, 140, 80, 0.35)',
			'ui-accent': '#d8845a',
			'ui-accent-hover': '#c0724a',
			'ui-glow': 'rgba(255, 180, 100, 0.25)',
			'ui-divider': 'rgba(180, 120, 60, 0.12)',
			'ui-tag': 'rgba(220, 150, 80, 0.12)',
			'ui-tag-text': '#8a5530',
			'ui-overlay': 'rgba(60, 30, 15, 0.5)',
			'ui-bar-bg': 'rgba(180, 120, 60, 0.1)',
			'ui-cancel': 'rgba(120, 80, 40, 0.5)',
			'ui-cancel-hover': 'rgba(120, 80, 40, 0.15)',
			'ui-icon-filter': 'invert(0.3) sepia(0.5) hue-rotate(340deg)',
		},
		day: {
			'ui-card': 'rgba(255, 255, 255, 0.93)',
			'ui-card-border': 'rgba(100, 160, 100, 0.12)',
			'ui-shadow': '0 20px 60px rgba(0, 0, 0, 0.1)',
			'ui-text': '#2a3a2a',
			'ui-text-soft': '#4a6a4a',
			'ui-text-muted': 'rgba(50, 80, 50, 0.4)',
			'ui-input': 'rgba(240, 248, 240, 0.5)',
			'ui-input-border': 'rgba(100, 160, 100, 0.12)',
			'ui-input-focus': 'rgba(80, 160, 80, 0.25)',
			'ui-accent': '#5a9e60',
			'ui-accent-hover': '#4a8e50',
			'ui-glow': 'rgba(100, 180, 120, 0.12)',
			'ui-divider': 'rgba(0, 0, 0, 0.06)',
			'ui-tag': 'rgba(80, 150, 80, 0.08)',
			'ui-tag-text': '#4a6a4a',
			'ui-overlay': 'rgba(0, 0, 0, 0.35)',
			'ui-bar-bg': 'rgba(0, 0, 0, 0.04)',
			'ui-cancel': 'rgba(50, 80, 50, 0.45)',
			'ui-cancel-hover': 'rgba(0, 0, 0, 0.06)',
			'ui-icon-filter': 'invert(0.4)',
		},
		dusk: {
			'ui-card': 'rgba(50, 38, 65, 0.93)',
			'ui-card-border': 'rgba(180, 130, 200, 0.15)',
			'ui-shadow': '0 20px 60px rgba(30, 15, 50, 0.35)',
			'ui-text': '#e0d0ea',
			'ui-text-soft': '#c0a8d0',
			'ui-text-muted': 'rgba(200, 170, 220, 0.45)',
			'ui-input': 'rgba(70, 50, 90, 0.45)',
			'ui-input-border': 'rgba(150, 100, 180, 0.2)',
			'ui-input-focus': 'rgba(180, 130, 220, 0.35)',
			'ui-accent': '#b070c8',
			'ui-accent-hover': '#c080d8',
			'ui-glow': 'rgba(180, 120, 220, 0.2)',
			'ui-divider': 'rgba(180, 140, 200, 0.12)',
			'ui-tag': 'rgba(160, 100, 200, 0.15)',
			'ui-tag-text': '#c0a0d0',
			'ui-overlay': 'rgba(25, 15, 40, 0.55)',
			'ui-bar-bg': 'rgba(160, 120, 200, 0.1)',
			'ui-cancel': 'rgba(200, 170, 220, 0.5)',
			'ui-cancel-hover': 'rgba(160, 100, 200, 0.15)',
			'ui-icon-filter': 'invert(0.8) sepia(0.2) hue-rotate(220deg)',
		},
		night: {
			'ui-card': 'rgba(16, 20, 36, 0.94)',
			'ui-card-border': 'rgba(80, 180, 170, 0.12)',
			'ui-shadow': '0 20px 60px rgba(0, 0, 0, 0.45)',
			'ui-text': '#c0c8d8',
			'ui-text-soft': '#8898b0',
			'ui-text-muted': 'rgba(130, 150, 180, 0.45)',
			'ui-input': 'rgba(25, 30, 50, 0.5)',
			'ui-input-border': 'rgba(60, 140, 130, 0.15)',
			'ui-input-focus': 'rgba(80, 180, 170, 0.25)',
			'ui-accent': '#50a8a0',
			'ui-accent-hover': '#60b8b0',
			'ui-glow': 'rgba(80, 200, 180, 0.12)',
			'ui-divider': 'rgba(80, 120, 140, 0.12)',
			'ui-tag': 'rgba(60, 160, 150, 0.12)',
			'ui-tag-text': '#70b0a8',
			'ui-overlay': 'rgba(5, 8, 15, 0.6)',
			'ui-bar-bg': 'rgba(60, 120, 140, 0.1)',
			'ui-cancel': 'rgba(130, 150, 180, 0.5)',
			'ui-cancel-hover': 'rgba(60, 140, 130, 0.15)',
			'ui-icon-filter': 'invert(0.75) sepia(0.15) hue-rotate(170deg)',
		},
	};

	return Object.entries(vars[phase])
		.map(([k, v]) => `--${k}:${v}`)
		.join(';');
}

export function getBlendedTheme(hour?: number): TimeTheme {
	const h = hour ?? new Date().getHours();
	const m = new Date().getMinutes();
	const fractionalHour = h + m / 60;

	// Transition boundaries with 1-hour blend zones
	const phases: { start: number; end: number; phase: TimePhase }[] = [
		{ start: 5, end: 8, phase: 'dawn' },
		{ start: 8, end: 17, phase: 'day' },
		{ start: 17, end: 20, phase: 'dusk' },
		{ start: 20, end: 29, phase: 'night' } // wraps past midnight
	];

	// Find current and next phase
	for (let i = 0; i < phases.length; i++) {
		const p = phases[i];
		const next = phases[(i + 1) % phases.length];
		const fh = fractionalHour < 5 ? fractionalHour + 24 : fractionalHour;

		if (fh >= p.start && fh < p.end) {
			// Check if we're in a transition zone (last hour of phase)
			const transitionStart = p.end - 1;
			if (fh >= transitionStart) {
				const t = fh - transitionStart;
				const from = themes[p.phase];
				const to = themes[next.phase];
				return {
					phase: p.phase,
					bgColor: lerpHexColor(from.bgColor, to.bgColor, t),
					bgGradientTop: from.bgGradientTop,
					bgGradientBottom: from.bgGradientBottom,
					flowerGlow: lerpNum(from.flowerGlow, to.flowerGlow, t),
					particleColor: from.particleColor,
					ambientAlpha: lerpNum(from.ambientAlpha, to.ambientAlpha, t)
				};
			}
			return themes[p.phase];
		}
	}

	return themes.night;
}
