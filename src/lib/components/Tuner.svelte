<script lang="ts">
    import { writable } from "svelte/store";
    import {
        Tuner,
        type Note,
        type State,
        TunerStateManager,
    } from "../core/tuner";
    import { applyTheme, switchTheme, themeStore } from "../core/theme";
    import Button from "./Button.svelte";
    import Icon from "./Icon.svelte";
    import { Icons } from "../../assets/icons";

    // array for storing the previous detected notes
    let noteHistory: Note[] = [];

    // the constant length of noteHistory
    const historyLength = 10;

    // variable for disabling start button when clicked
    let startButtonDisabled = false;

    // boolean to control settings window display
    let showSettings: boolean = false;

    const tunerState = writable<State>();

    function getState(): State {
        return $tunerState;
    }

    function setState(value: State): void {
        return tunerState.set(value);
    }

    const stateManager = new TunerStateManager(getState, setState);

    const tuner = new Tuner(stateManager);

    function toggleTheme() {
        $themeStore.name === "DARK_THEME"
            ? switchTheme("LIGHT_THEME")
            : switchTheme("DARK_THEME");
    }

    async function start() {
        try {
            await tuner.init();
        } catch (error) {
            throw error;
        }
    }
</script>

<div
    class="tuner"
    style={applyTheme($themeStore)}>
    <div class="state">
        {#if Math.abs($tunerState.deviation) < 10}
            <p
                style="color: #00ff00; text-shadow: 0px 0px 30px #00ff00dd;"
                class="note-state">
                Spot on!
            </p>
        {:else if Math.abs($tunerState.deviation) < 20}
            <p
                style="color: #1eff1e; text-shadow: 0px 0px 30px #1eff1edd;"
                class="note-state">
                Tuned!
            </p>
        {:else if $tunerState.deviation <= 20}
            <p
                style="color: #ff0000; text-shadow: 0px 0px 30px #ff0000dd;"
                class="note-state">
                Low
            </p>
        {:else if $tunerState.deviation >= 20}
            <p
                style="color: #ff0000; text-shadow: 0px 0px 30px #ff0000dd;"
                class="note-state">
                High
            </p>
        {/if}
    </div>
    <ul class="notes-display">
        {#each tuner.noteStrings as noteName}
            <li
                class={`note-column ${
                    $tunerState.note.name === noteName ? "indicated" : ""
                }`}>
                <div />
                <p>
                    {noteName + $tunerState.note.octave}
                </p>
            </li>
        {/each}
    </ul>
    <div class="bottom-panel">
        <div class="info">
            <p class="freq">
                <b>Frequency: </b>{$tunerState.pitch.toFixed(1)} Hz
            </p>
            <p class="deviation">
                <b>Deviation: </b>{$tunerState.deviation} Hz
            </p>
        </div>
        <div class="actions">
            <Button
                style="flex-grow: 1;"
                on:click={toggleTheme}
                ><Icon
                    src={$themeStore.variant === "DARK"
                        ? Icons.Sunny
                        : Icons.Moon}
                    size="1.5rem" /></Button>
            <Button
                style="flex-grow: 2;"
                disabled={!$tunerState.loading}
                on:click={start}>Start</Button>
            <Button
                style="flex-grow: 1;"
                on:click={start}
                ><Icon
                    src={Icons.Settings}
                    size="1.5rem" /></Button>
        </div>
    </div>
</div>

<style lang="scss">
    .tuner {
        width: 100%;
        height: 100%;
        background-color: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;

        & > div {
            margin: 4rem;
        }

        .state {
            font-size: 3rem;
            font-weight: bold;
        }

        .notes-display {
            height: 14rem;
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: space-between;

            & > li {
                padding: 1.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;

                & > div {
                    width: 0.8rem;
                    height: 8rem;
                    background-color: var(--on-background);
                    border-radius: var(--border-radius);
                    transition: 0.2s ease;
                }

                & > p {
                    margin: 0.5rem 0;
                }
            }

            & > li.indicated {
                & > div {
                    height: 10rem;
                    font-weight: bold;
                }

                & > p {
                    font-weight: bold;
                }
            }
        }

        .bottom-panel {
            width: 90%;
            max-width: 30rem;
            border-radius: var(--border-radius);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            font-size: 1rem;
            background-color: var(--background-accent);
            color: var(--primary);

            & > div {
                padding: 1rem;
            }

            & > .info {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            & > .actions {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: stretch;
                gap: 1rem;
            }
        }
    }
</style>
