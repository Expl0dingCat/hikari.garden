<script lang="ts">
	interface Props {
		value: string; // YYYY-MM-DD
		onchange: (date: string) => void;
	}

	let { value, onchange }: Props = $props();

	let open = $state(false);
	let viewYear = $state(0);
	let viewMonth = $state(0); // 0-indexed

	$effect(() => {
		const d = new Date(value + 'T00:00:00');
		viewYear = d.getFullYear();
		viewMonth = d.getMonth();
	});

	const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	let calendarDays = $derived.by(() => {
		const first = new Date(viewYear, viewMonth, 1);
		const startDay = first.getDay();
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

		const cells: { day: number; month: number; year: number; current: boolean }[] = [];

		// Previous month padding
		for (let i = startDay - 1; i >= 0; i--) {
			const pm = viewMonth === 0 ? 11 : viewMonth - 1;
			const py = viewMonth === 0 ? viewYear - 1 : viewYear;
			cells.push({ day: daysInPrev - i, month: pm, year: py, current: false });
		}

		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			cells.push({ day: d, month: viewMonth, year: viewYear, current: true });
		}

		// Next month padding to fill 6 rows max (42 cells) or at least complete row
		const remaining = 7 - (cells.length % 7);
		if (remaining < 7) {
			const nm = viewMonth === 11 ? 0 : viewMonth + 1;
			const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
			for (let d = 1; d <= remaining; d++) {
				cells.push({ day: d, month: nm, year: ny, current: false });
			}
		}

		return cells;
	});

	function formatDisplay(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function pad(n: number): string {
		return n < 10 ? '0' + n : '' + n;
	}

	function selectDay(cell: { day: number; month: number; year: number }) {
		const dateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
		onchange(dateStr);
		open = false;
	}

	function isSelected(cell: { day: number; month: number; year: number }): boolean {
		const dateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
		return dateStr === value;
	}

	function isToday(cell: { day: number; month: number; year: number }): boolean {
		const now = new Date();
		return cell.day === now.getDate() && cell.month === now.getMonth() && cell.year === now.getFullYear();
	}

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.date-picker')) {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="date-picker">
	<button class="date-trigger" onclick={(e) => { e.stopPropagation(); open = !open; }}>
		{formatDisplay(value)}
	</button>

	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="calendar" onclick={(e) => e.stopPropagation()}>
			<div class="cal-header">
				<button class="cal-nav" onclick={prevMonth}>&lsaquo;</button>
				<span class="cal-title">{MONTHS[viewMonth]} {viewYear}</span>
				<button class="cal-nav" onclick={nextMonth}>&rsaquo;</button>
			</div>

			<div class="cal-days">
				{#each DAYS as day}
					<span class="cal-day-label">{day}</span>
				{/each}
			</div>

			<div class="cal-grid">
				{#each calendarDays as cell}
					<button
						class="cal-cell"
						class:other-month={!cell.current}
						class:selected={isSelected(cell)}
						class:today={isToday(cell)}
						onclick={() => selectDay(cell)}
					>
						{cell.day}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.date-picker {
		position: relative;
	}

	.date-trigger {
		font-family: inherit;
		font-size: 12px;
		padding: 3px 9px;
		border: none;
		border-radius: 6px;
		background: var(--ui-bar-bg, rgba(255,255,255,0.08));
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		letter-spacing: 0.3px;
		white-space: nowrap;
		transition: background 0.15s;
	}
	.date-trigger:hover {
		background: var(--ui-tag, rgba(255,255,255,0.12));
	}

	.calendar {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 60;
		background: var(--ui-card, #fff);
		border: 1px solid var(--ui-card-border, rgba(0,0,0,0.1));
		border-radius: 12px;
		padding: 10px;
		box-shadow: var(--ui-shadow, 0 8px 32px rgba(0,0,0,0.15));
		width: 220px;
	}

	.cal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.cal-nav {
		background: none;
		border: none;
		font-size: 18px;
		color: var(--ui-text-muted);
		cursor: var(--cursor-pointer, pointer);
		padding: 2px 6px;
		border-radius: 4px;
		line-height: 1;
		transition: color 0.15s, background 0.15s;
	}
	.cal-nav:hover {
		color: var(--ui-text);
		background: var(--ui-bar-bg);
	}

	.cal-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--ui-text-soft, var(--ui-text));
		letter-spacing: 0.3px;
	}

	.cal-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0;
		margin-bottom: 2px;
	}

	.cal-day-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--ui-text-muted);
		text-align: center;
		padding: 2px 0;
	}

	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1px;
	}

	.cal-cell {
		font-family: inherit;
		font-size: 12px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--ui-text-soft, var(--ui-text));
		cursor: var(--cursor-pointer, pointer);
		transition: background 0.12s, color 0.12s;
		margin: 0 auto;
	}
	.cal-cell:hover {
		background: var(--ui-bar-bg);
	}
	.cal-cell.other-month {
		color: var(--ui-text-muted);
		opacity: 0.4;
	}
	.cal-cell.today {
		font-weight: 600;
		color: var(--ui-accent);
	}
	.cal-cell.selected {
		background: var(--ui-accent);
		color: #fff;
		font-weight: 500;
	}
	.cal-cell.selected:hover {
		background: var(--ui-accent-hover, var(--ui-accent));
	}
</style>
