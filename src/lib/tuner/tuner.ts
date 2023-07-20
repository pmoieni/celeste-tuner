import { writable } from "svelte/store";

interface Note {
    name: string;
    octave: number;
}

interface State {
    loading: boolean;
    sensitivity: number;
    pitch: number;
    note: Note;
    deviation: number;
}

class Tuner {
    private readonly octaveLength = 12;
    private readonly buflen = 2048;
    private readonly logOfTwo = Math.log(2);
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private mediaStreamSource: MediaStreamAudioSourceNode;
    private buf = new Float32Array(this.buflen);
    private _state: State;

    public readonly noteStrings = [
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

    public state = writable<State>({
        loading: true,
        sensitivity: 0.02,
        pitch: 440,
        note: {
            name: this.noteStrings[9],
            octave: 4,
        },
        deviation: 0,
    });

    constructor() {
        this.state.subscribe((v) => {
            this._state = v;
        });
    }

    // converts frequency to note
    // frequency of 440 will be converted to note 'A'
    // more info: https://alijamieson.co.uk/2021/12/20/describing-relationship-two-notes/#:~:text=An%20octave%20is%20an%20intervals,A5%20would%20be%20880%20Hz.
    private noteFromPitch = (frequency: number) => {
        var noteNum =
            this.octaveLength * (Math.log(frequency / 440) / this.logOfTwo);
        return Math.round(noteNum) + 69;
    }

    // note: the number 69 corresponds to the pitch A4
    // more info: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C1/C1S3_FrequencyPitch.html
    private frequencyFromNoteNumber = (noteMIDI: number) => {
        return 440 * Math.pow(2, (noteMIDI - 69) / this.octaveLength);
    }

    // an octave has 12 notes and 1200 cents
    // which means that there is 100 cents between each note
    // cents off from pitch gives us the deviation from the detected note
    // if it's higher than 50 or lower than -50 it means we have entered the bounds of the other notes
    // eg: out of tune
    private centsOffFromPitch = (frequency: number, noteMIDI: number) => {
        return Math.floor(
            (this.octaveLength *
                100 *
                Math.log(frequency / this.frequencyFromNoteNumber(noteMIDI))) /
            this.logOfTwo
        );
    }

    private getPitch = (buf, sampleRate) => {
        // Implements the ACF2+ algorithm
        let SIZE = buf.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            let val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < this._state.sensitivity)
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
            for (let j = 0; j < SIZE - i; j++)
                c[i] = c[i] + buf[j] * buf[j + i];

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

    private updatePitch = () => {
        this.analyser.getFloatTimeDomainData(this.buf);
        let pitch = this.getPitch(this.buf, this.audioContext.sampleRate);

        if (pitch !== -1) {
            this._state.pitch = pitch;

            // the index of the detected note
            let noteIdx = this.noteFromPitch(pitch);

            // noteIdx % noteString.length(108) is one octave high (because octaves start from 0)
            // -12 decreases the octave
            this._state.note.name =
                this.noteStrings[noteIdx % this.noteStrings.length];
            this._state.note.octave =
                Math.floor(noteIdx / this.octaveLength) - 1;
            this._state.deviation = this.centsOffFromPitch(pitch, noteIdx); // deviation from original note frequency
        }
        requestAnimationFrame(this.updatePitch);
    }

    private gotStream = (stream: MediaStream) => {
        // run the necessary commands when permission was granted
        // Create an AudioNode from the stream.
        // this is the stream of sound received from microphone
        this.mediaStreamSource =
            this.audioContext.createMediaStreamSource(stream);

        // Connect it to the destination.
        // this is like the tools needed for analaysing the sound buffer
        // more info here: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createAnalyser
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.buflen;

        // connect the analyser to audio stream
        this.mediaStreamSource.connect(this.analyser);
        this._state.loading = false;

        this.updatePitch();
    }

    init = async () => {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)(
            {
                latencyHint: "interactive",
            }
        );

        navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: true,
                    autoGainControl: false,
                    noiseSuppression: false,
                },
                video: false,
            })
            .then((stream) => {
                this.gotStream(stream)
            })
            .catch((err) => {
                // display error if permission was not granted
                console.log("getUserMedia threw exception:" + err);
                this._state.loading = false;
            });
    }
}

export { Tuner, type Note, type State };
