<script lang="ts">
    import { Tuner, type Note } from "../tuner/tuner";

    // array for storing the previous detected notes
    let noteHistory: Note[] = [];

    // the constant length of noteHistory
    const historyLength = 10;

    // variable for disabling start button when clicked
    let startButtonDisabled = false;

    // boolean to control settings window display
    let showSettings: boolean = false;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)(
        {
            latencyHint: "interactive",
        }
    );

    const { init, state, noteStrings } = new Tuner(audioContext);

    async function start() {
        try {
            await init();
        } catch (error) {
            throw error;
        }
    }
</script>

<div class="ac-demo">
    <div class="state">
        {#if Math.abs($state.deviation) < 10}
            <p
                style="color: #00ff00; text-shadow: 0px 0px 30px #00ff00dd;"
                class="note-state">
                Spot on!
            </p>
        {:else if Math.abs($state.deviation) < 20}
            <p
                style="color: #1eff1e; text-shadow: 0px 0px 30px #1eff1edd;"
                class="note-state">
                Tuned!
            </p>
        {:else if $state.deviation <= 20}
            <p
                style="color: #ff0000; text-shadow: 0px 0px 30px #ff0000dd;"
                class="note-state">
                Low
            </p>
        {:else if $state.deviation >= 20}
            <p
                style="color: #ff0000; text-shadow: 0px 0px 30px #ff0000dd;"
                class="note-state">
                High
            </p>
        {/if}
    </div>
    <div class="info">
        <p class="deviation">Deviation: {$state.deviation} Hz</p>
        <p class="freq">Frequency: {$state.pitch.toFixed(1)} Hz</p>
    </div>
    <ul class="notes-display">
        {#each noteStrings as noteName}
            <li class="note-column">
                <div
                    class="note-column_indicator {noteName === $state.note?.name
                        ? 'indicated'
                        : ''}">
                    <div class="center" />
                    {#if $state.deviation > 0}
                        <div
                            class="deviation_high"
                            style="height: {(Math.abs($state.deviation) / 50) *
                                100}%;" />
                    {:else if $state.deviation < 0}
                        <div
                            class="deviation_low"
                            style="height: {(Math.abs($state.deviation) / 50) *
                                100 -
                                50}%;" />
                    {/if}
                </div>
                <p
                    class="note-column_name {noteName === $state.note?.name
                        ? 'indicated'
                        : ''}">
                    {noteName + $state.note.octave}
                </p>
            </li>
        {/each}
    </ul>
    <div class="history">
        {#each noteHistory as note, i}
            {#if i === noteHistory.length - 1}
                <p style="color: #00ff00; font-weight: bold;">
                    {$state.note?.name + $state.note?.octave}
                </p>
            {:else}
                <p>{$state.note?.name + $state.note?.octave}</p>
            {/if}
        {/each}
    </div>
    <div class="actions">
        <button
            class="settingsBtn"
            type="button"
            on:click={() => {
                showSettings = true;
            }}>
            Settings
        </button>
        <button
            class="startBtn"
            disabled={startButtonDisabled}
            type="button"
            on:click={start}>Start</button>
    </div>
    {#if showSettings}
        <button
            class="settings-modal"
            on:click|self={() => {
                showSettings = false;
            }}>
            <div class="settings-con">
                <div class="setting-sensitevity">
                    <p>
                        Sensitivity (higher means lower sensitivity): {$state.sensitivity}
                    </p>
                    <input
                        type="range"
                        bind:value={$state.sensitivity}
                        min="0.01"
                        max="0.2"
                        step="0.01" />
                </div>
                <button
                    on:click={() => {
                        $state.sensitivity = 0.02;
                    }}>Reset Settings</button>
            </div>
        </button>
    {/if}
</div>

<style lang="scss">
    .ac-demo {
        display: flex;
        justify-content: center;
        flex-direction: column;
        width: 100%;
        height: 100%;

        & > div {
            padding: 1rem;
        }

        .state {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            font-size: 3rem;
            font-weight: bold;
        }

        .info {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-evenly;
            flex-wrap: wrap;
            text-align: center;

            .deviation {
                font-size: 1.2rem;
            }

            .freq {
                font-size: 1.2rem;
            }
        }

        .notes-display {
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 12rem;

            .note-column {
                display: flex;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                flex-direction: column;

                .note-column_indicator {
                    width: 0.5rem;
                    border-radius: 0.5rem;
                    background-color: #888;
                    height: 5rem;
                    position: relative;
                    overflow: hidden;

                    .center {
                        position: absolute;
                        width: 100%;
                        height: 4px;
                        top: 50%;
                        left: 0;
                        z-index: 1;
                        background-color: #000;
                    }

                    .deviation_high {
                        width: 100%;
                        background-color: #8400ff;
                        position: absolute;
                        left: 0;
                        bottom: 50%;
                        display: none;
                        transition: 0.3s ease;
                    }

                    .deviation_low {
                        width: 100%;
                        background-color: #8400ff;
                        position: absolute;
                        left: 0;
                        top: 50%;
                        display: none;
                        transition: 0.3s ease;
                    }
                }

                .note-column_name {
                    margin: 1rem 0;
                    color: #888;
                    font-size: 1rem;
                    width: 3rem;
                }

                .note-column_indicator.indicated {
                    background-color: #fff;
                    height: 8rem;

                    .deviation_high,
                    .deviation_low {
                        display: block;
                    }
                }

                .note-column_name.indicated {
                    color: #fff;
                    font-size: 2rem;
                    font-weight: bold;
                    width: 8rem;
                }
            }
        }

        .history {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;

            p {
                font-size: 1.5rem;
                margin: 0 0.8rem;
            }
        }

        .actions {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            height: 5rem;

            button {
                padding: 1rem 5rem;
                color: #000;
                background-color: #fff;
                font-size: 1rem;
                border-radius: 0.5rem;
                transition: 0.3s ease;
                margin: 0.5rem;
                font-weight: bold;
            }

            button:hover {
                box-shadow: 0 0 30px rgba($color: #fff, $alpha: 0.3);
            }

            .startBtn:disabled,
            .startBtn[disabled] {
                background-color: #aaa;
            }

            .startBtn:disabled:hover,
            .startBtn[disabled]:hover {
                box-shadow: none;
            }
        }

        .settings-modal {
            position: fixed;
            width: 100%;
            height: 100%;
            background-color: rgba($color: #000, $alpha: 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;

            .settings-con {
                padding: 1rem;
                font-size: 1rem;
                background-color: #fff;
                color: #000;
                border-radius: 0.5rem;

                input {
                    margin: 0 0.5rem;
                }

                & > div {
                    margin: 0.5rem 0;
                    display: flex;
                }

                button {
                    width: 100%;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    border: none;
                    outline: none;
                    font-size: 1rem;
                    background-color: #000;
                    color: #fff;
                }
            }
        }

        @media screen and (max-width: 40rem) {
            .actions {
                justify-content: center;

                button {
                    padding: 1rem 1rem;
                    width: 100%;
                }
            }

            .notes-display {
                .note-column {
                    .note-column_indicator {
                        width: 0.5rem;
                        border-radius: 0.5rem;
                        height: 4rem;
                    }

                    .note-column_name {
                        margin: 0.5rem 0;
                        font-size: 1rem;
                        width: 2rem;
                    }

                    .note-column_indicator.indicated {
                        height: 6rem;
                    }

                    .note-column_name.indicated {
                        font-size: 1.5rem;
                        font-weight: bold;
                        width: 6rem;
                    }
                }
            }
        }

        @media screen and (max-width: 28rem) {
            .notes-display {
                .note-column {
                    .note-column_indicator {
                        width: 0.5rem;
                        border-radius: 0.5rem;
                        height: 4rem;
                    }

                    .note-column_name {
                        margin: 0.5rem 0;
                        font-size: 0.8rem;
                        width: 1.6rem;
                    }

                    .note-column_indicator.indicated {
                        height: 6rem;
                    }

                    .note-column_name.indicated {
                        font-size: 1.2rem;
                        font-weight: bold;
                        width: 3rem;
                    }
                }
            }
        }
    }
</style>
