const SCALE = 2; // each pixel drawn 2x2 for visibility

function createCursor(pixels: string[], palette: Record<string, string>, hotX: number, hotY: number): string {
	const h = pixels.length;
	const w = pixels[0].length;
	const canvas = document.createElement('canvas');
	canvas.width = w * SCALE;
	canvas.height = h * SCALE;
	const ctx = canvas.getContext('2d')!;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const ch = pixels[y][x];
			if (ch !== '.' && palette[ch]) {
				ctx.fillStyle = palette[ch];
				ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
			}
		}
	}

	return `url(${canvas.toDataURL()}) ${hotX * SCALE} ${hotY * SCALE}, auto`;
}

// Green pixel art leaf-arrow
const defaultPalette: Record<string, string> = {
	'1': '#1e2e14',  // dark outline
	'2': '#4a7c59',  // green fill
	'3': '#7db88a',  // highlight
};

const defaultPixels = [
	'1...........',
	'11..........',
	'131.........',
	'1321........',
	'13221.......',
	'132221......',
	'1322221.....',
	'13222221....',
	'132222221...',
	'132221111...',
	'1321.21.....',
	'121..121....',
	'11....121...',
	'1......121..',
	'.......121..',
	'........11..',
];

// Warm golden arrow when hovering flowers
const pointerPalette: Record<string, string> = {
	'1': '#3a2508',
	'2': '#c89030',
	'3': '#f0d078',
};

// Grabbing hand (small pixel art)
const grabPalette: Record<string, string> = {
	'1': '#2a1e14',
	'2': '#c4956a',
	'3': '#e0be98',
};

const grabPixels = [
	'..1.1.1.....',
	'.1312131....',
	'.1322231....',
	'1132222131..',
	'1322222231..',
	'1322222221..',
	'.132222221..',
	'..12222221..',
	'..13222221..',
	'...1222221..',
	'...1222221..',
	'....122221..',
	'....112211..',
	'................',
];

const grabbingPixels = [
	'................',
	'..1.1.1.........',
	'.1212121........',
	'.12222231.......',
	'.13222231.......',
	'..1222221.......',
	'..1322221.......',
	'...122221.......',
	'...132221.......',
	'...112211.......',
	'................',
];

export interface CursorSet {
	default: string;
	pointer: string;
	grab: string;
	grabbing: string;
}

export function generateCursors(): CursorSet {
	return {
		default: createCursor(defaultPixels, defaultPalette, 0, 0),
		pointer: createCursor(defaultPixels, pointerPalette, 0, 0),
		grab: createCursor(grabPixels, grabPalette, 5, 5),
		grabbing: createCursor(grabbingPixels, grabPalette, 5, 4),
	};
}
