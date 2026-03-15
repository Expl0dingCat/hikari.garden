export interface FlowerPosition {
	x: number;
	y: number;
	index: number;
}

// Fermat's spiral for natural-looking placement
// Each successive flower is placed at the golden angle
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
const SPACING = 80; // pixels between flowers (at scale)
/**
 * Calculate spiral positions for all entries.
 * Entries are pre-sorted by date so same-day flowers naturally
 * end up adjacent in the spiral — close but not overlapping.
 */
export function calculateSpiralPositions(
	count: number,
	_dates?: string[]
): FlowerPosition[] {
	return calculateSimpleSpiral(count);
}

function calculateSimpleSpiral(count: number): FlowerPosition[] {
	const positions: FlowerPosition[] = [];

	for (let i = 0; i < count; i++) {
		if (i === 0) {
			positions.push({ x: 0, y: 0, index: i });
			continue;
		}

		const angle = i * GOLDEN_ANGLE;
		const radius = SPACING * Math.sqrt(i);
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		positions.push({ x, y, index: i });
	}

	return positions;
}

export function getGardenBounds(positions: FlowerPosition[]): {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	width: number;
	height: number;
} {
	if (positions.length === 0) {
		return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
	}

	let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
	for (const p of positions) {
		if (p.x < minX) minX = p.x;
		if (p.x > maxX) maxX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.y > maxY) maxY = p.y;
	}

	return {
		minX,
		maxX,
		minY,
		maxY,
		width: maxX - minX,
		height: maxY - minY
	};
}
