<script lang="ts">
    import { applyTheme, themeStore } from "./lib/core/theme";
    import Tuner from "./lib/components/Tuner.svelte";

    import { slide } from "svelte/transition";
    import { useRegisterSW } from "virtual:pwa-register/svelte";
    function close() {
        offlineReady.set(false);
        needRefresh.set(false);
    }

    const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
        onRegisterError(error) {
            alert("SW registration error: " + error);
        },
        onOfflineReady() {
            setTimeout(close, 5000);
        },
    });

    $: toast = $offlineReady || $needRefresh;
</script>

{#if toast}
    <div
        in:slide
        out:slide
        role="alert">
        <div>
            <span>&#127881;</span>
            {#if $needRefresh}
                <span>
                    A new version of this site is available! Click the reload
                    button to update.
                </span>
                <button on:click={() => updateServiceWorker(true)}>
                    Reload
                </button>
            {/if}
        </div>
        <button on:click={close}> Close </button>
    </div>
{/if}
<main style={applyTheme($themeStore)}>
    <Tuner />
</main>

<style lang="scss">
    @font-face {
        font-family: inter;
        src: url(./assets/fonts/Inter-Regular.ttf);
    }

    :global(*) {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :global(body) {
        overflow: hidden;
    }

    main {
        width: 100vw;
        height: 100vh;
        background-color: var(--background);
        font-family: inter;
        color: var(--on-background);
    }
</style>
