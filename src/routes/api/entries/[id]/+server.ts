import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getEntryById, updateEntry, deleteEntry, smellFlower } from '$lib/server/entries.js';
import { generateFlowerName } from '$lib/generation/NameGenerator.js';
import { hashString } from '$lib/generation/SeededRandom.js';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	if (body.action === 'smell') {
		const smells = smellFlower(params.id);
		if (smells === null) {
			return json({ error: 'Not found' }, { status: 404 });
		}
		return json({ smells });
	}
	return json({ error: 'Unknown action' }, { status: 400 });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const existing = getEntryById(params.id);
	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const body = await request.json();
	const updated = {
		...existing,
		date: body.date ?? existing.date,
		updatedAt: Date.now(),
		text: body.text ?? existing.text,
		mood: body.mood ?? existing.mood,
		flowerSeed: body.mood
			? hashString(existing.id + (body.date ?? existing.date))
			: existing.flowerSeed,
		flowerName: body.mood
			? generateFlowerName(
					body.mood,
					hashString(existing.id + (body.date ?? existing.date))
				)
			: existing.flowerName,
		tags: body.tags !== undefined ? body.tags : existing.tags
	};

	updateEntry(updated);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const deleted = deleteEntry(params.id);
	if (!deleted) {
		return json({ error: 'Not found' }, { status: 404 });
	}
	return json({ ok: true });
};
