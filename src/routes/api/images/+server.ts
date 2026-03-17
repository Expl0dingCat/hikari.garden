import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_DIR = resolve('data/images');

mkdirSync(IMAGE_DIR, { recursive: true });

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.isAdmin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const files = formData.getAll('images') as File[];

	if (files.length === 0) {
		return json({ error: 'No files provided' }, { status: 400 });
	}

	const filenames: string[] = [];

	for (const file of files) {
		if (!ALLOWED_TYPES.includes(file.type)) {
			return json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
		}
		if (file.size > MAX_SIZE) {
			return json({ error: 'File too large (max 10MB)' }, { status: 400 });
		}

		const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
		const filename = `${crypto.randomUUID()}.${ext}`;
		const buffer = Buffer.from(await file.arrayBuffer());
		writeFileSync(resolve(IMAGE_DIR, filename), buffer);
		filenames.push(filename);
	}

	return json({ filenames }, { status: 201 });
};
