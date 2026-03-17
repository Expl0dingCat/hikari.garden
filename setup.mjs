#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { hashSync } from 'bcryptjs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

console.log('\nhikari.garden setup\n');

if (existsSync('.env')) {
	const overwrite = await ask('.env already exists. Overwrite? (y/N) ');
	if (overwrite.toLowerCase() !== 'y') {
		console.log('Keeping existing .env');
		rl.close();
		process.exit(0);
	}
}

const password = await ask('Garden password: ');
if (!password) {
	console.error('Password cannot be empty.');
	rl.close();
	process.exit(1);
}

const hash = hashSync(password, 12);
const name = (await ask('Your name (default: hikari): ')) || 'hikari';
const tz = (await ask('Timezone IANA (default: America/Toronto): ')) || 'America/Toronto';
const tzLabel = (await ask(`Timezone label (default: ${tz.split('/').pop()}): `)) || tz.split('/').pop();

const spotifyId = await ask('Spotify Client ID (optional, press Enter to skip): ');
const spotifySecret = spotifyId ? await ask('Spotify Client Secret: ') : '';

const env = `HIKARI_ADMIN_PASSWORD_HASH='${hash}'
PUBLIC_OWNER_NAME=${name}
PUBLIC_OWNER_TIMEZONE=${tz}
PUBLIC_OWNER_TIMEZONE_LABEL=${tzLabel}
SPOTIFY_CLIENT_ID=${spotifyId}
SPOTIFY_CLIENT_SECRET=${spotifySecret}
PUBLIC_ORIGINAL=false
`;

writeFileSync('.env', env);
if (!existsSync('data')) mkdirSync('data');

console.log('\n.env created. Run `npm run dev` to start your garden.\n');
rl.close();
