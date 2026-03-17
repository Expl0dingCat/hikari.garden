import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
	throw redirect(302, `/?flower=${params.id}`);
};
