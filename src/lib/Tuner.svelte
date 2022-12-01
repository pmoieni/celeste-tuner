<script lang="ts">
  // audio context to control audio input
  let audioContext: AudioContext = null;

  // variable to store Audio Context Analyser Node
  let analyser: AnalyserNode = null;

  // variable to store microphone stream data
  let mediaStreamSource: MediaStreamAudioSourceNode = null;

  // false if note was ignored
  let isConfident = false;

  // defines the sensitivity of the algorithm
  // higher value means lower sensitivity
  let sensitivity = 0.02; // default is 0.02

  // length of an octave which has 12 notes
  // in Western musical scale
  const octaveLength = 12;

  // pitch is the same as frequency, just different names
  let pitch = 0;

  // interface for defining note
  interface Note {
    Name: string;
    Octave: number;
  }

  // the name of the note which is chosen from noteStrings array
  let note: Note = {
    Name: "A",
    Octave: 4,
  };

  // current octave in use
  let octave: number = 4;

  // the amount of frequency between the detected note that is the closest to the frequency
  // imagine note A4. it has the frequency of 440 Hz. if the frequency of the sound is 430 Hz
  // it's still the same note which is A4. but with -10 Hz of deviation.
  let deviation = 0;

  // array for storing the previous detected notes
  let noteHistory: Note[] = [];

  // the constant length of noteHistory
  const historyLength = 10;

  // variable for disabling start button when clicked
  let startButtonDisabled = false;

  // boolean to control settings window display
  let showSettings: boolean = false;

  // string array of 9 octaves of notes
  let noteStrings = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  // brain of the tuner
  // don't change anything if you don't know how the physics of signals work
  function autoCorrelate(buf, sampleRate) {
    // Implements the ACF2+ algorithm
    let SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < sensitivity)
      // not enough signal
      // the note is ignored
      return -1;

    let r1 = 0,
      r2 = SIZE - 1,
      thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++)
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    for (let i = 1; i < SIZE / 2; i++)
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1,
      maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    let x1 = c[T0 - 1],
      x2 = c[T0],
      x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2,
      b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  // an async function that waits for the user to grant microphone permission
  async function getUserMedia() {
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
        video: false,
      })
      .then((stream) => {
        // run the necessary commands when permission was granted
        gotStream(stream);
        startButtonDisabled = true;
      })
      .catch((err) => {
        // display error if permission was not granted
        alert("getUserMedia threw exception:" + err);
        startButtonDisabled = false;
      });
  }

  function gotStream(stream) {
    // Create an AudioNode from the stream.
    // this is the stream of sound received from microphone
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    // this is like the tools needed for analaysing the sound buffer
    // more info here: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createAnalyser
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    // connect the analyser to audio stream
    mediaStreamSource.connect(analyser);

    // start detecting notes
    updatePitch();
  }

  // converts frequency to note
  // frequency of 440 will be converted to note 'A'
  // more info: https://alijamieson.co.uk/2021/12/20/describing-relationship-two-notes/#:~:text=An%20octave%20is%20an%20intervals,A5%20would%20be%20880%20Hz.
  function noteFromPitch(frequency) {
    var noteNum = octaveLength * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
  }

  // note: the number 69 corresponds to the pitch A4
  // more info: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C1/C1S3_FrequencyPitch.html
  function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / octaveLength);
  }

  // an octave has 12 notes and 1200 cents
  // which means that there is 100 cents between each note
  // cents off from pitch gives us the deviation from the detected note
  // if it's higher than 50 or lower than -50 it means we have entered the bounds of the other notes
  // eg: out of tune
  function centsOffFromPitch(frequency, note) {
    return Math.floor(
      (octaveLength *
        100 *
        Math.log(frequency / frequencyFromNoteNumber(note))) /
        Math.log(2)
    );
  }

  // array for received buffer of audio
  let buflen = 2048;
  let buf = new Float32Array(buflen);
  // updates the note using requestAnimationFrame
  function updatePitch() {
    const wasmMemory = new Float32Array(wasm.exports.memory.buffer);
    const wasmMemoryPtr = wasm.exports.getBufferPointer();
    analyser.getFloatTimeDomainData(buf);
    let ac = autoCorrelate(buf, audioContext.sampleRate);

    wasmMemory.set(buf, wasmMemoryPtr / wasmMemory.BYTES_PER_ELEMENT);
    let acwasm = wasm.exports.autoCorrelate(
      audioContext.sampleRate,
      sensitivity
    );

    if (ac !== acwasm) {
      console.log({ ac, acwasm, diff: ac - acwasm });
    }

    if (ac == -1) {
      // note was ignored
      isConfident = false;
    } else {
      isConfident = true;
      pitch = ac;

      // the index of the detected note
      let noteIdx = noteFromPitch(pitch);

      if (note?.Name !== noteHistory[noteHistory.length - 1]?.Name) {
        // keep the length of the array fixed
        if (noteHistory.length === historyLength) {
          // remove first note of noteHistory array and shift other notes one index to the left
          noteHistory.shift();
        }

        // new note detected, push it to history array
        noteHistory = [
          ...noteHistory,
          { Name: note?.Name, Octave: note.Octave },
        ];
      }

      // noteIdx % noteString.length(108) is one octave high (because octaves start from 0)
      // -12 decreases the octave
      note.Name = noteStrings[noteIdx % noteStrings.length];
      note.Octave = Math.floor(noteIdx / octaveLength) - 1;
      octave = note.Octave;
      deviation = centsOffFromPitch(pitch, noteIdx); // deviation from original note frequency
    }
    requestAnimationFrame(updatePitch);
  }

  function init() {
    audioContext = new (window.AudioContext || globalThis.webkitAudioContext)();
    getUserMedia(); // get microphone permission
  }
</script>

<div class="ac-demo">
  <div class="state">
    {#if Math.abs(deviation) < 10}
      <p
        style="color: #00ff00; text-shadow: 0px 0px 30px #00ff00dd;"
        class="note-state"
      >
        Spot on!
      </p>
    {:else if Math.abs(deviation) < 20}
      <p
        style="color: #1eff1e; text-shadow: 0px 0px 30px #1eff1edd;"
        class="note-state"
      >
        Tuned!
      </p>
    {:else if deviation <= 20}
      <p
        style="color: #ff0000; text-shadow: 0px 0px 30px #ff0000dd;"
        class="note-state"
      >
        Low
      </p>
    {:else if deviation >= 20}
      <p
        style="color: #ff0000; text-shadow: 0px 0px 30px #ff0000dd;"
        class="note-state"
      >
        High
      </p>
    {/if}
  </div>
  <div class="info">
    <p class="deviation">Deviation: {deviation} Hz</p>
    <p class="freq">Frequency: {pitch.toFixed(1)} Hz</p>
  </div>
  <ul class="notes-display">
    {#each noteStrings as noteName}
      <li class="note-column">
        <div
          class="note-column_indicator {noteName === note?.Name
            ? 'indicated'
            : ''}"
        >
          <div class="center" />
          {#if deviation > 0}
            <div
              class="deviation_high"
              style="height: {(Math.abs(deviation) / 50) * 100}%;"
            />
          {:else if deviation < 0}
            <div
              class="deviation_low"
              style="height: {(Math.abs(deviation) / 50) * 100 - 50}%;"
            />
          {/if}
        </div>
        <p
          class="note-column_name {noteName === note?.Name ? 'indicated' : ''}"
        >
          {noteName + octave}
        </p>
      </li>
    {/each}
  </ul>
  <div class="history">
    {#each noteHistory as note, i}
      {#if i === noteHistory.length - 1}
        <p style="color: #00ff00; font-weight: bold;">
          {note?.Name + note?.Octave}
        </p>
      {:else}
        <p>{note?.Name + note?.Octave}</p>
      {/if}
    {/each}
  </div>
  <div class="actions">
    <button
      class="settingsBtn"
      type="button"
      on:click={() => {
        showSettings = true;
      }}
    >
      Settings
    </button>
    <button
      class="startBtn"
      disabled={startButtonDisabled}
      type="button"
      on:click={init}>Start</button
    >
  </div>
  {#if showSettings}
    <div
      class="settings-modal"
      on:click|self={() => {
        showSettings = false;
      }}
    >
      <div class="settings-con">
        <div class="setting-sensitevity">
          <p>Sensitivity (higher means lower sensitivity): {sensitivity}</p>
          <input
            type="range"
            bind:value={sensitivity}
            min="0.01"
            max="0.2"
            step="0.01"
          />
        </div>
        <button
          on:click={() => {
            sensitivity = 0.02;
          }}>Reset Settings</button
        >
      </div>
    </div>
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
