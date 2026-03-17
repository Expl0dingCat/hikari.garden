import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getEntryById } from '$lib/server/entries.js';

export const load: PageServerLoad = async ({ params, url }) => {
	const entry = getEntryById(params.id);
	if (!entry) {
		throw redirect(302, '/');
	}

	const origin = url.origin;
	const firstImage = entry.images?.[0];

	return {
		flowerName: entry.flowerName,
		title: entry.title || entry.flowerName,
		description: entry.text.slice(0, 200) + (entry.text.length > 200 ? '...' : ''),
		image: firstImage ? `${origin}/api/images/${firstImage}` : null,
		flowerId: entry.id
	};
};
