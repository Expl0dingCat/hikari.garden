import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAllEntries, createEntry } from '$lib/server/entries.js';
import { generateFlowerName } from '$lib/generation/NameGenerator.js';
import { hashString } from '$lib/generation/SeededRandom.js';
import type { JournalEntry } from '$lib/types.js';

export const GET: RequestHandler = async () => {
	const entries = getAllEntries();
	return json(entries);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const now = Date.now();
	const id = crypto.randomUUID();

	// Use client-provided seed (matches preview) or generate one
	const flowerSeed = typeof body.flowerSeed === 'number'
		? body.flowerSeed
		: hashString(id + body.date + now.toString());

	const entry: JournalEntry = {
		id,
		date: body.date,
		createdAt: now,
		updatedAt: now,
		title: (body.title || '').slice(0, 50),
		text: body.text,
		mood: body.mood,
		flowerSeed,
		flowerName: generateFlowerName(body.mood, flowerSeed),
		tags: body.tags,
		weather: body.weather || undefined,
		images: body.images || undefined,
		song: body.song || undefined,
		smells: 0
	};

	createEntry(entry);
	return json(entry, { status: 201 });
};
