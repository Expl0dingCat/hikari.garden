import type { PageServerLoad } from './$types.js';
import { getAllEntries } from '$lib/server/entries.js';

export const load: PageServerLoad = async () => {
	return {
		entries: getAllEntries()
	};
};
