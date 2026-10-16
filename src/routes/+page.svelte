<script lang="ts">
	let innerWidth = $state(0);
	let innerHeight = $state(0);

	let bgSize = $derived(innerHeight / 13);
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<main class="size-full">
	<div class="grid" style:background-size={`${bgSize}px ${bgSize}px`}></div>
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		background: radial-gradient(circle, #00240f 0%, #001509 35%, #000 85%);

		.grid {
			position: absolute;
			inset: 0;
			height: 100%;
			width: 100%;
			pointer-events: none;
			background-image:
				linear-gradient(to right, rgba(100, 255, 160, 0.32) 1px, transparent 1px),
				linear-gradient(to bottom, rgba(100, 255, 160, 0.32) 1px, transparent 1px);
			-webkit-mask-image: radial-gradient(
				circle,
				#000 0%,
				#000 10%,
				rgba(0, 0, 0, 0.7) 45%,
				transparent 85%
			);
			mask-image: radial-gradient(
				circle,
				#000 0%,
				#000 10%,
				rgba(0, 0, 0, 0.7) 45%,
				transparent 85%
			);
		}
	}
</style>
