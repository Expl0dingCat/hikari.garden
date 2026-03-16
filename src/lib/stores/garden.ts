import { writable, derived } from 'svelte/store';
import type { JournalEntry } from '$lib/types.js';

export const entries = writable<JournalEntry[]>([]);
export const selectedFlower = writable<JournalEntry | null>(null);
export const isAdmin = writable(false);

/** Current month view in YYYY-MM format */
export const currentMonth = writable<string>(new Date().toISOString().slice(0, 7));

/** Entries filtered to the current month */
export const monthEntries = derived(
	[entries, currentMonth],
	([$entries, $currentMonth]) =>
		$entries.filter((e) => e.date.startsWith($currentMonth))
);

/** All unique months that have entries, sorted ascending */
export const availableMonths = derived(entries, ($entries) => {
	const months = new Set($entries.map((e) => e.date.slice(0, 7)));
	return [...months].sort();
});

/** Custom cursor CSS values, set by GardenEngine after init */
export const cursorDefault = writable<string>('');
export const cursorPointer = writable<string>('');
