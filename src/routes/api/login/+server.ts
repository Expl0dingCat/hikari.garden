import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { verifyPassword, createSession } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { password } = await request.json();

	if (!password || !verifyPassword(password)) {
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	const token = createSession();
	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: true,
		maxAge: 7 * 24 * 60 * 60
	});

	return json({ ok: true });
};
