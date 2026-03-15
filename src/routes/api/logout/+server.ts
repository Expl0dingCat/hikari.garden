import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { destroySession } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('session');
	if (token) {
		destroySession(token);
	}
	cookies.delete('session', { path: '/' });
	return json({ ok: true });
};
