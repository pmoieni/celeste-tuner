<script lang="ts">
  import Tuner from "./lib/Tuner.svelte";

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
  <div in:slide out:slide role="alert">
    <div>
      <span>&#127881;</span>
      {#if $needRefresh}
        <span>
          A new version of this site is available! Click the reload button to
          update.
        </span>
        <button on:click={() => updateServiceWorker(true)}> Reload </button>
      {/if}
    </div>
    <button on:click={close}> Close </button>
  </div>
{/if}
<main>
  <Tuner />
</main>

<style lang="scss">
  @font-face {
    font-family: raleway;
    src: url(./assets/fonts/Raleway-Regular.ttf);
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: raleway;
    color: #fff;
    background-color: #000;
    overflow: hidden;
  }

  :global(button) {
    background-color: transparent;
    border: none;
    outline: none;
  }

  main {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
