import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session');
	event.locals.isAdmin = sessionToken ? validateSession(sessionToken) : false;
	return resolve(event);
};
