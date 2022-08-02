interface TunerOpts {
  sensitivity: number;
}

interface state {
  pitch: number;
  deviation: number;
  note: Note;
}

export let state: state = {
  pitch: 440,
  deviation: 0,
  note: {
    Name: "A",
    Octave: 4,
  },
};

// string array of 9 octaves of notes
const noteStrings = [
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

// interface for defining note
interface Note {
  Name: string;
  Octave: number;
}

export class Tuner {
  private audioContext: AudioContext = null;

  // variable to store Audio Context Analyser Node
  private analyser: AnalyserNode = null;

  // variable to store microphone stream data
  private mediaStreamSource: MediaStreamAudioSourceNode = null;

  // false if note was ignored
  private isConfident: boolean = false;

  noteHistory: Note[] = [];

  // defines the sensitivity of the algorithm
  // higher value means lower sensitivity
  sensitivity: number = 0.02; // default is 0.02

  // length of an octave which has 12 notes
  // in Western musical scale
  private readonly octaveLength: number = 12;

  // the constant length of noteHistory
  private readonly historyLength = 10;

  constructor(opts: TunerOpts) {
    this.sensitivity = opts.sensitivity;
  }

  // converts frequency to note
  // frequency of 440 will be converted to note 'A'
  // more info: https://alijamieson.co.uk/2021/12/20/describing-relationship-two-notes/#:~:text=An%20octave%20is%20an%20intervals,A5%20would%20be%20880%20Hz.
  private noteFromPitch(frequency) {
    var noteNum = this.octaveLength * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
  }

  // note: the number 69 corresponds to the pitch A4
  // more info: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C1/C1S3_FrequencyPitch.html
  private frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / this.octaveLength);
  }

  // an octave has 12 notes and 1200 cents
  // which means that there is 100 cents between each note
  // cents off from pitch gives us the deviation from the detected note
  // if it's higher than 50 or lower than -50 it means we have entered the bounds of the other notes
  // eg: out of tune
  private centsOffFromPitch(frequency, note) {
    return Math.floor(
      (this.octaveLength *
        100 *
        Math.log(frequency / this.frequencyFromNoteNumber(note))) /
        Math.log(2)
    );
  }

  private autoCorrelate(buf, sampleRate) {
    // Implements the ACF2+ algorithm
    let SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < this.sensitivity)
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

  // array for received buffer of audio
  private readonly buflen = 2048;
  private buf = new Float32Array(this.buflen);

  // updates the note using requestAnimationFrame
  // should be an array function to avoid "Cannot read properties of undefined" error
  private updatePitch = () => {
    this.analyser.getFloatTimeDomainData(this.buf);
    let ac = this.autoCorrelate(this.buf, this.audioContext.sampleRate);

    if (ac == -1) {
      // note was ignored
      this.isConfident = false;
    } else {
      this.isConfident = true;
      state.pitch = ac;

      // the index of the detected note
      let noteIdx = this.noteFromPitch(state.pitch);

      if (
        state.note?.Name !== this.noteHistory[this.noteHistory.length - 1]?.Name
      ) {
        // keep the length of the array fixed
        if (this.noteHistory.length === this.historyLength) {
          // remove first note of noteHistory array and shift other notes one index to the left
          this.noteHistory.shift();
        }

        // new note detected, push it to history array
        this.noteHistory = [
          ...this.noteHistory,
          {
            Name: state.note?.Name,
            Octave: state.note.Octave,
          },
        ];
      }

      // noteIdx % noteString.length(108) is one octave high (because octaves start from 0)
      // "- 1" decreases one octave
      state = {
        pitch: state.pitch,
        note: {
          Name: noteStrings[noteIdx % noteStrings.length],
          Octave: Math.floor(noteIdx / this.octaveLength) - 1,
        },
        deviation: this.centsOffFromPitch(state.pitch, noteIdx), // deviation from original note frequency
      };
      console.log(state);
    }
    requestAnimationFrame(this.updatePitch);
  };

  private gotStream(stream) {
    // Create an AudioNode from the stream.
    // this is the stream of sound received from microphone
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    // this is like the tools needed for analyzing the sound buffer
    // more info here: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createAnalyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    // connect the analyser to audio stream
    this.mediaStreamSource.connect(this.analyser);

    // start detecting notes
    this.updatePitch();
  }

  // an async function that waits for the user to grant microphone permission
  private getUserMedia() {
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
        this.gotStream(stream);
      })
      .catch((err) => {
        // display error if permission was not granted
        alert("getUserMedia threw exception:" + err);
      });
  }

  start() {
    this.audioContext = new (window.AudioContext ||
      globalThis.webkitAudioContext)();

    this.getUserMedia();
  }
}

export { noteStrings };
export type { TunerOpts };
