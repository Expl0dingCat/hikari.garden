import { writable } from 'svelte/store';
import type { JournalEntry } from '$lib/types.js';

export const entries = writable<JournalEntry[]>([]);
export const selectedFlower = writable<JournalEntry | null>(null);
export const isAdmin = writable(false);

/** Custom cursor CSS values, set by GardenEngine after init */
export const cursorDefault = writable<string>('');
export const cursorPointer = writable<string>('');
