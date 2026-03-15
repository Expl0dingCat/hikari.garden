import type { MoodVector } from '$lib/types.js';

export interface ColorPalette {
	petals: [string, string];
	center: string;
	stem: string;
	accent: string;
}

// Each palette is associated with a mood "center" for interpolation
interface WeightedPalette {
	mood: MoodVector;
	palette: ColorPalette;
}

const palettes: WeightedPalette[] = [
	// Warm sunset — high joy, high energy
	{
		mood: { joy: 1, energy: 1, tenderness: 0.3, clarity: 0.5, hope: 0.7 },
		palette: {
			petals: ['#ff6b6b', '#ffd93d'],
			center: '#fff3e0',
			stem: '#4a7c59',
			accent: '#ff8e53'
		}
	},
	// Soft pastel — high joy, low energy
	{
		mood: { joy: 0.9, energy: 0.2, tenderness: 0.8, clarity: 0.5, hope: 0.6 },
		palette: {
			petals: ['#c9b1ff', '#ffc4d6'],
			center: '#fff8e7',
			stem: '#7db88f',
			accent: '#e8b4f8'
		}
	},
	// Storm — low joy, high energy
	{
		mood: { joy: 0.1, energy: 0.9, tenderness: 0.2, clarity: 0.3, hope: 0.2 },
		palette: {
			petals: ['#4a148c', '#e53935'],
			center: '#263238',
			stem: '#37474f',
			accent: '#7c4dff'
		}
	},
	// Muted earth — low joy, low energy
	{
		mood: { joy: 0.1, energy: 0.1, tenderness: 0.3, clarity: 0.2, hope: 0.1 },
		palette: {
			petals: ['#8d6e63', '#a1887f'],
			center: '#6d4c41',
			stem: '#5d4037',
			accent: '#bcaaa4'
		}
	},
	// Rose garden — high tenderness
	{
		mood: { joy: 0.6, energy: 0.4, tenderness: 1, clarity: 0.5, hope: 0.6 },
		palette: {
			petals: ['#f48fb1', '#f8bbd0'],
			center: '#fce4ec',
			stem: '#66bb6a',
			accent: '#ec407a'
		}
	},
	// Crystal clear — high clarity
	{
		mood: { joy: 0.5, energy: 0.5, tenderness: 0.3, clarity: 1, hope: 0.5 },
		palette: {
			petals: ['#4fc3f7', '#b3e5fc'],
			center: '#e1f5fe',
			stem: '#43a047',
			accent: '#00bcd4'
		}
	},
	// Dawn hope — high hope
	{
		mood: { joy: 0.6, energy: 0.5, tenderness: 0.5, clarity: 0.6, hope: 1 },
		palette: {
			petals: ['#ffcc02', '#ff9800'],
			center: '#fff9c4',
			stem: '#558b2f',
			accent: '#ffab40'
		}
	},
	// Twilight — moderate everything, slight melancholy
	{
		mood: { joy: 0.4, energy: 0.3, tenderness: 0.6, clarity: 0.4, hope: 0.4 },
		palette: {
			petals: ['#7e57c2', '#5c6bc0'],
			center: '#9fa8da',
			stem: '#455a64',
			accent: '#b388ff'
		}
	},
	// Spring green — balanced positive
	{
		mood: { joy: 0.7, energy: 0.6, tenderness: 0.5, clarity: 0.7, hope: 0.8 },
		palette: {
			petals: ['#81c784', '#aed581'],
			center: '#f1f8e9',
			stem: '#33691e',
			accent: '#69f0ae'
		}
	},
	// Ice — low everything except clarity
	{
		mood: { joy: 0.2, energy: 0.2, tenderness: 0.1, clarity: 0.9, hope: 0.3 },
		palette: {
			petals: ['#90a4ae', '#b0bec5'],
			center: '#cfd8dc',
			stem: '#546e7a',
			accent: '#80cbc4'
		}
	},
	// Ember — low joy, moderate energy, some hope
	{
		mood: { joy: 0.3, energy: 0.6, tenderness: 0.4, clarity: 0.3, hope: 0.5 },
		palette: {
			petals: ['#d84315', '#bf360c'],
			center: '#ffab91',
			stem: '#4e342e',
			accent: '#ff6e40'
		}
	},
	// Moonlight — low energy, high tenderness, moderate hope
	{
		mood: { joy: 0.4, energy: 0.1, tenderness: 0.9, clarity: 0.6, hope: 0.5 },
		palette: {
			petals: ['#e1bee7', '#ce93d8'],
			center: '#f3e5f5',
			stem: '#6a8a6d',
			accent: '#ba68c8'
		}
	}
];

function moodDistance(a: MoodVector, b: MoodVector): number {
	return Math.sqrt(
		(a.joy - b.joy) ** 2 +
			(a.energy - b.energy) ** 2 +
			(a.tenderness - b.tenderness) ** 2 +
			(a.clarity - b.clarity) ** 2 +
			(a.hope - b.hope) ** 2
	);
}

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
	return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function lerpColor(a: string, b: string, t: number): string {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b);
	return rgbToHex(
		Math.round(ar + (br - ar) * t),
		Math.round(ag + (bg - ag) * t),
		Math.round(ab + (bb - ab) * t)
	);
}

export function getPalette(mood: MoodVector): ColorPalette {
	// Find the 3 closest palettes and blend
	const scored = palettes
		.map((wp) => ({ wp, dist: moodDistance(mood, wp.mood) }))
		.sort((a, b) => a.dist - b.dist);

	const top = scored.slice(0, 3);
	const totalInvDist = top.reduce((sum, s) => sum + 1 / (s.dist + 0.01), 0);
	const weights = top.map((s) => 1 / (s.dist + 0.01) / totalInvDist);

	// Weighted blend of the top 3 palettes
	const blend = (getter: (p: ColorPalette) => string): string => {
		let r = 0,
			g = 0,
			b = 0;
		for (let i = 0; i < top.length; i++) {
			const [cr, cg, cb] = hexToRgb(getter(top[i].wp.palette));
			r += cr * weights[i];
			g += cg * weights[i];
			b += cb * weights[i];
		}
		return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
	};

	return {
		petals: [blend((p) => p.petals[0]), blend((p) => p.petals[1])],
		center: blend((p) => p.center),
		stem: blend((p) => p.stem),
		accent: blend((p) => p.accent)
	};
}

export { lerpColor, hexToRgb, rgbToHex };
