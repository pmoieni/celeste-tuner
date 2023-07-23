<script lang="ts">
    import { themeStore } from "../core/theme";

    export let src;
    export let size = "2rem";
    $: invert = $themeStore.variant === "DARK";
</script>

{#if src}
    <img
        style={`width: ${size};
        height: ${size};
        max-width: ${size};
        max-height: ${size}; ${invert ? "filter: invert(1);" : ""}`}
        {src}
        alt={src} />
{/if}
