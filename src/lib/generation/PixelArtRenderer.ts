import type { FlowerDNA } from '$lib/types.js';
import { getPetalTemplate } from './PetalShapes.js';
import { hexToRgb, lerpColor } from './ColorPalettes.js';

const CANVAS_W = 32;
const CANVAS_H = 48;

export interface RenderedFlower {
	pixels: Uint8ClampedArray; // RGBA pixel data
	width: number;
	height: number;
}

function setPixel(
	data: Uint8ClampedArray,
	w: number,
	x: number,
	y: number,
	color: string,
	alpha = 255
) {
	if (x < 0 || x >= w || y < 0 || y >= CANVAS_H) return;
	const i = (y * w + x) * 4;
	const [r, g, b] = hexToRgb(color);
	// Simple alpha blend
	if (data[i + 3] === 0 || alpha === 255) {
		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
		data[i + 3] = alpha;
	}
}

function drawStem(data: Uint8ClampedArray, w: number, dna: FlowerDNA) {
	const cx = Math.floor(w / 2);
	const stemTop = CANVAS_H - dna.stemHeight - 6; // leave room for flower head
	const stemBottom = CANVAS_H - 1;

	for (let y = stemBottom; y >= stemTop; y--) {
		const progress = (stemBottom - y) / (stemBottom - stemTop);
		// Curve the stem based on tenderness
		const curveOffset = Math.round(Math.sin(progress * Math.PI) * dna.stemCurve * 3);
		setPixel(data, w, cx + curveOffset, y, dna.stemColor);
		// Thicker base
		if (progress < 0.3) {
			setPixel(data, w, cx + curveOffset + 1, y, dna.stemColor);
		}
	}

	// Leaves
	for (let l = 0; l < dna.leafCount; l++) {
		const leafY = Math.round(stemBottom - (dna.stemHeight * (0.3 + l * 0.25)));
		const side = l % 2 === 0 ? 1 : -1;
		const curveAtLeaf = Math.round(
			Math.sin(((stemBottom - leafY) / (stemBottom - stemTop)) * Math.PI) * dna.stemCurve * 3
		);
		const leafX = cx + curveAtLeaf;

		// Simple 3-pixel leaf
		setPixel(data, w, leafX + side, leafY, dna.stemColor);
		setPixel(data, w, leafX + side * 2, leafY, dna.stemColor);
		setPixel(data, w, leafX + side * 2, leafY - 1, dna.stemColor);
	}

	return stemTop;
}

function drawPetals(data: Uint8ClampedArray, w: number, dna: FlowerDNA, centerY: number) {
	const cx = Math.floor(w / 2);
	const template = getPetalTemplate(dna.petalShape);
	const bloomScale = 0.3 + dna.bloomState * 0.7; // buds are smaller

	for (let p = 0; p < dna.petalCount; p++) {
		const angle = (p / dna.petalCount) * Math.PI * 2 + dna.rotation;
		const variation = dna.petalVariation[p] ?? 1;
		const dist = (template.height * 0.5 + 1) * bloomScale * dna.petalSize * variation;

		// Petal center position
		const px = cx + Math.round(Math.cos(angle) * dist);
		const py = centerY + Math.round(Math.sin(angle) * dist * 0.7); // squish vertically

		// Color gradient across petal
		const colorT = p / dna.petalCount;
		const petalColor = lerpColor(dna.petalColors[0], dna.petalColors[1], colorT);

		// Draw petal pixels
		const scale = dna.petalSize * variation * bloomScale;
		for (const [tx, ty] of template.pixels) {
			const sx = Math.round((tx - template.width / 2) * scale);
			const sy = Math.round((ty - template.height / 2) * scale);

			// Rotate pixel around petal center
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);
			const rx = Math.round(sx * cos - sy * sin);
			const ry = Math.round(sx * sin + sy * cos);

			setPixel(data, w, px + rx, py + ry, petalColor);
		}
	}
}

function drawCenter(data: Uint8ClampedArray, w: number, dna: FlowerDNA, centerY: number) {
	const cx = Math.floor(w / 2);
	const size = Math.max(1, Math.round(dna.petalSize * 1.5));

	// Draw a small circle for the center
	for (let dy = -size; dy <= size; dy++) {
		for (let dx = -size; dx <= size; dx++) {
			if (dx * dx + dy * dy <= size * size) {
				setPixel(data, w, cx + dx, centerY + dy, dna.centerColor);
			}
		}
	}

	// Sparkle effect — small bright dots around center
	if (dna.sparkle) {
		const sparklePositions = [
			[-2, -2],
			[2, -2],
			[-2, 2],
			[2, 2]
		];
		for (const [dx, dy] of sparklePositions) {
			setPixel(data, w, cx + dx, centerY + dy, '#ffffff', 200);
		}
	}
}

export function renderFlower(dna: FlowerDNA): RenderedFlower {
	const data = new Uint8ClampedArray(CANVAS_W * CANVAS_H * 4);

	const stemTop = drawStem(data, CANVAS_W, dna);
	const flowerCenterY = stemTop - 1;

	drawPetals(data, CANVAS_W, dna, flowerCenterY);
	drawCenter(data, CANVAS_W, dna, flowerCenterY);

	return { pixels: data, width: CANVAS_W, height: CANVAS_H };
}

/**
 * Generate an animation frame variant of a rendered flower.
 * Applies subtle per-pixel shifts, color jitter, and sparkle changes
 * seeded by the frame index so each frame is deterministic.
 */
export function renderFlowerFrame(
	base: RenderedFlower,
	frameIndex: number,
	seed: number
): RenderedFlower {
	const out = new Uint8ClampedArray(base.pixels.length);
	out.set(base.pixels);

	const w = base.width;
	const h = base.height;

	// Simple seeded hash for this frame
	let s = (seed * 2654435761 + frameIndex * 340573321) >>> 0;
	function rng() {
		s ^= s << 13;
		s ^= s >> 17;
		s ^= s << 5;
		return (s >>> 0) / 4294967296;
	}

	// Collect non-transparent pixels and find edge pixels
	const pixels: [number, number][] = [];
	const edgePixels: [number, number][] = [];
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			if (base.pixels[i + 3] > 0) {
				pixels.push([x, y]);
				// Check if edge (has a transparent neighbor)
				let isEdge = false;
				for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
					const nx = x + dx, ny = y + dy;
					if (nx < 0 || nx >= w || ny < 0 || ny >= h) { isEdge = true; break; }
					if (base.pixels[(ny * w + nx) * 4 + 3] === 0) { isEdge = true; break; }
				}
				if (isEdge) edgePixels.push([x, y]);
			}
		}
	}

	// 1) Color jitter: 20% of pixels get ±25 RGB shift per channel
	const jitterCount = Math.max(4, Math.floor(pixels.length * 0.2));
	for (let j = 0; j < jitterCount; j++) {
		const [px, py] = pixels[Math.floor(rng() * pixels.length)];
		const i = (py * w + px) * 4;
		for (let c = 0; c < 3; c++) {
			const shift = Math.round((rng() - 0.5) * 50);
			out[i + c] = Math.max(0, Math.min(255, out[i + c] + shift));
		}
	}

	// 2) Edge pixel shifts: move 15% of edge pixels by 1px outward
	const shiftCount = Math.max(2, Math.floor(edgePixels.length * 0.15));
	for (let j = 0; j < shiftCount; j++) {
		const [px, py] = edgePixels[Math.floor(rng() * edgePixels.length)];
		const i = (py * w + px) * 4;
		if (out[i + 3] === 0) continue; // already moved

		const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
		const dir = dirs[Math.floor(rng() * 4)];
		const nx = px + dir[0];
		const ny = py + dir[1];
		if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
			const ni = (ny * w + nx) * 4;
			if (out[ni + 3] === 0) {
				out[ni] = out[i]; out[ni + 1] = out[i + 1];
				out[ni + 2] = out[i + 2]; out[ni + 3] = out[i + 3];
				out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 0;
			}
		}
	}

	// 3) Randomly darken a few pixels (contrast variation)
	const darkenCount = 2 + Math.floor(rng() * 3);
	for (let j = 0; j < darkenCount; j++) {
		const [px, py] = pixels[Math.floor(rng() * pixels.length)];
		const i = (py * w + px) * 4;
		const dim = 30 + Math.floor(rng() * 40);
		out[i] = Math.max(0, out[i] - dim);
		out[i + 1] = Math.max(0, out[i + 1] - dim);
		out[i + 2] = Math.max(0, out[i + 2] - dim);
	}

	return { pixels: out, width: w, height: h };
}
