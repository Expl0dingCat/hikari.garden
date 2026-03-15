import type { PetalShapeId } from '$lib/types.js';

// Each petal shape is defined as a set of pixels relative to a center point.
// Coordinates are [x, y] offsets. These are "half petals" for bilateral shapes
// or full for radial placement.
export interface PetalTemplate {
	pixels: [number, number][];
	width: number;
	height: number;
}

const templates: Record<PetalShapeId, PetalTemplate> = {
	round: {
		width: 5,
		height: 5,
		pixels: [
			[1, 0], [2, 0], [3, 0],
			[0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
			[0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
			[0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
			[1, 4], [2, 4], [3, 4]
		]
	},
	pointed: {
		width: 3,
		height: 7,
		pixels: [
			[1, 0],
			[1, 1],
			[0, 2], [1, 2], [2, 2],
			[0, 3], [1, 3], [2, 3],
			[0, 4], [1, 4], [2, 4],
			[0, 5], [1, 5], [2, 5],
			[1, 6]
		]
	},
	heart: {
		width: 5,
		height: 5,
		pixels: [
			[0, 0], [1, 0], [3, 0], [4, 0],
			[0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
			[0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
			[1, 3], [2, 3], [3, 3],
			[2, 4]
		]
	},
	star: {
		width: 5,
		height: 5,
		pixels: [
			[2, 0],
			[1, 1], [2, 1], [3, 1],
			[0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
			[1, 3], [2, 3], [3, 3],
			[2, 4]
		]
	},
	teardrop: {
		width: 3,
		height: 6,
		pixels: [
			[1, 0],
			[0, 1], [1, 1], [2, 1],
			[0, 2], [1, 2], [2, 2],
			[0, 3], [1, 3], [2, 3],
			[1, 4], [2, 4],
			[1, 5]
		]
	},
	jagged: {
		width: 5,
		height: 5,
		pixels: [
			[0, 0], [2, 0], [4, 0],
			[0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
			[1, 2], [2, 2], [3, 2],
			[0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
			[1, 4], [3, 4]
		]
	},
	wispy: {
		width: 3,
		height: 7,
		pixels: [
			[1, 0],
			[2, 1],
			[1, 2], [2, 2],
			[0, 3], [1, 3],
			[0, 4], [1, 4],
			[1, 5], [2, 5],
			[2, 6]
		]
	},
	bell: {
		width: 5,
		height: 6,
		pixels: [
			[2, 0],
			[1, 1], [2, 1], [3, 1],
			[1, 2], [2, 2], [3, 2],
			[0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
			[0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
			[0, 5], [1, 5], [2, 5], [3, 5], [4, 5]
		]
	}
};

export function getPetalTemplate(shape: PetalShapeId): PetalTemplate {
	return templates[shape];
}

export function getAllShapeIds(): PetalShapeId[] {
	return Object.keys(templates) as PetalShapeId[];
}
