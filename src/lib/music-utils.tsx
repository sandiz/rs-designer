
import * as teoria from 'teoria';
import Tone from 'tone';
import WebAudioScheduler from './web-audio-scheduler'
import {
    ScaleInfo, CircleOfFifths, ChordTime, ChordInfo, BeatTime, NoteTime, baseTuning, allTunings,
} from '../types';
import MediaPlayerService from '../services/mediaplayer';

const rotate = (array: string[], times: number): string[] => {
    const copy = array.slice(0)
    //eslint-disable-next-line
    while (times--) {
        const temp: string | undefined = copy.shift();
        if (typeof temp !== 'undefined') copy.push(temp)
    }
    return copy;
}

const rotateMode = (obj: ScaleInfo, times: number) => {
    const copy: ScaleInfo = { steps: rotate(obj.steps, times), chordType: rotate(obj.chordType, times) }
    return copy;
}

export const STRING_OCTAVE = [2, 2, 3, 3, 3, 4]; /* octave range */


export const pitches = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
export const enharmonicPitches = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
export const pitchesFromC = rotate(pitches, 3); // starts with C
const cof: CircleOfFifths = {
    majors: [...pitches],
    minors: [...rotate(pitches, 9)],
};
const majorMode: ScaleInfo = {
    steps: "W W H W W W H".split(" "),
    chordType: ['m', 'm', '', '', 'm', 'dim', ''],
}
const minorMode = rotateMode(majorMode, 5);

export const getChordsInKey = (key: string, type: string): string[] => {
    const newSteps: string[] = []
    const ltype = type.toLowerCase();
    let mode: ScaleInfo | null = null
    switch (ltype) {
        case 'minor':
            mode = minorMode
            break;
        case 'major':
            mode = majorMode
            break;
        default:
            break;
    }
    if (mode) {
        const index = pitches.indexOf(key);
        if (index !== -1 && mode) {
            let noteIndex = index;
            mode.steps.map((v, i) => {
                if (v === 'W') noteIndex += 2;
                if (v === 'H') noteIndex += 1

                if (noteIndex >= pitches.length) {
                    noteIndex -= (pitches.length)
                }
                const newNote = pitches[noteIndex];
                if (mode) {
                    //console.log(mode.chordType, i);
                    newSteps.push(`${newNote}${mode.chordType[i]}`)
                }
                return newSteps;
            });
            const last = newSteps.pop()
            if (last) {
                newSteps.unshift(last)
            }
            //console.log(`chords in ${key} ${type}: `, newSteps);
        }
    }
    return newSteps;
}
/*
test cases
getChordsInKey('A', 'Major');
getChordsInKey('F#', 'Minor');
getChordsInKey('G', 'Major');
getChordsInKey('E', 'Minor');
getChordsInKey('C', 'Major');
getChordsInKey('A', 'Minor');
*/

export const getRelativeKey = (key: string, type: string): [string, string] => {
    const ltype = type.toLowerCase();
    let index = 0;
    switch (ltype) {
        case 'major':
            index = cof.majors.indexOf(key);
            if (index !== -1) {
                return [cof.minors[index], 'minor'];
            }
            break;
        case 'minor':
            index = cof.minors.indexOf(key);
            if (index !== -1) {
                return [cof.majors[index], 'major'];
            }
            break;
        default:
            return [key, type];
    }
    return [key, type];
}

export const getParalleKey = (key: string, type: string): [string, string] => {
    const ltype = type.toLowerCase();
    switch (ltype) {
        case 'major':
            return [key, 'minor']
        case 'minor':
            return [key, 'major']
        default:
            return [key, type];
    }
}

export const getTransposedKey = (key: string, value: number, enharmonic = false): string => {
    const index = pitches.indexOf(key);
    if (index !== -1) {
        let diff = index + value;
        if (diff < 0) {
            diff = (pitches.length) - Math.abs(diff);
        }
        else if (diff > pitches.length - 1) {
            diff -= (pitches.length)
        }
        return enharmonic ? enharmonicPitches[diff] : pitches[diff];
    }
    return '';
}

export const getChordCombinedForm = (item: ChordTime): string => {
    let c = ""
    if (item.type === 'maj') c = item.key;
    else if (item.type === 'min') c = item.key + "m";
    else {
        c = "N";
    }
    return c;
}

export const getTransposedChords = (chords: ChordTime[], value: number): ChordTime[] => {
    //return chords;
    const t: ChordTime[] = []
    for (let i = 0; i < chords.length; i += 1) {
        const c: ChordTime = { ...chords[i] };
        c.key = getTransposedKey(chords[i].key, value);
        t.push(c);
    }
    return t;
}

export const getUniqueChords = (chordsAnalysisData: ChordTime[]): string[] => {
    const onlyChords = chordsAnalysisData.map((v) => {
        return getChordCombinedForm(v);
    })
    const uniq = [...Array.from(new Set(onlyChords))];
    return uniq;
}

export const countChords = (chord: string, chordArray: ChordTime[]): number => {
    return chordArray.filter(item => {
        const c = getChordCombinedForm(item);
        if (c === chord) return true;
        return false;
    }).length;
}


export const semitonesForTempoChange = (startBPM: number, endBPM: number): number => {
    return Math.round((Math.log(endBPM / startBPM) / 0.05776227) * 100) / 100;     // calculate math function
}

export const getChordInfo = async (chord: string, type: string, origtype: string): Promise<ChordInfo | null> => {
    try {
        const ct = `${chord.toUpperCase()}${type.toLowerCase()}`;
        //eslint-disable-next-line
        const c: ChordInfo = require(`chords/packages/chord-chart/guitar/${ct}.json`);

        const ct2 = `${chord.toUpperCase()}${origtype.toLowerCase()}`;
        c.notes = teoria.chord(ct2).simple();
        return c;
    }
    catch (ex) {
        return null;
    }
}

export const C1Hz = 32;
export const C8Hz = 4096;
export const C1base2 = 5;
export const C8base2 = 12;

export const midiToNote = (midi: number): string => {
    const noteNum = parseInt(Math.round(midi).toString(), 10);
    let note = pitchesFromC[noteNum % 12];
    note = `${note}${parseInt((noteNum / 12).toString(), 10) - 1}`;
    return note;
}

export const hzToMidi = (freq: number): number => {
    return 12 * (Math.log2(freq) - Math.log2(440.0)) + 69;
}

export const midiToHz = (midi: number): number => {
    return 440.0 * (2.0 ** ((midi - 69) / 12.0));
}

export const hzToNote = (freq: number): string => {
    return midiToNote(hzToMidi(freq));
}

export const noteToMidi = (note: string, roundMidi = true): number => {
    const pitchMap: { [key: string]: number } = {
        C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
    };

    const accMap: { [key: string]: number } = {
        '#': 1, '': 0, b: -1, '!': -1,
    };

    const regex = /([A-Ga-g])([#b!]*)([+-]?\d+)?([+-]\d+)?$/gm;
    const match = regex.exec(note);
    if (match == null) return 0;
    const pitch = match[1];
    const accidental = match[2]
    let offset = 0;
    for (let i = 0; i < accidental.length; i += 1) {
        const c = (accidental.charAt(i));
        offset += accMap[c];
    }
    const octave = match[3];
    const cents = match[4];
    let octaveNum = 0;
    let centsNum = 0;

    if (octave) octaveNum = parseInt(octave, 10)
    else octaveNum = 0;

    if (cents) centsNum = parseInt(cents, 10) * 1e-2;
    else centsNum = 0;

    let noteValue = 12 * (octaveNum + 1) + pitchMap[pitch] + offset + centsNum;

    if (roundMidi) noteValue = parseInt(Math.round(noteValue).toString(), 10);
    return noteValue;
}

export const noteToHz = (note: string): number => {
    return midiToHz(noteToMidi(note));
}

interface TempoMarking {
    min: number;
    max: number;
    tag: string;
}
const tempoMarkings: { [key: string]: TempoMarking } = {
    Larghissimo: { min: 1, max: 24, tag: "very, very slow" },
    Grave: { min: 25, max: 45, tag: "very slow" },
    Largo: { min: 40, max: 60, tag: "broadly" },
    Lento: { min: 45, max: 60, tag: "slowly" },
    Larghetto: { min: 60, max: 66, tag: "rather broadly" },
    Adagio: { min: 66, max: 76, tag: "slowly with great expression" },
    Andante: { min: 76, max: 108, tag: "walking pace" },
    Andantino: { min: 80, max: 108, tag: "slightly faster than andante" },
    "Marcia moderato": { min: 83, max: 85, tag: "the manner of a march" },
    "Andante moderato": { min: 92, max: 112, tag: "between andante and moderato" },
    Moderato: { min: 108, max: 120, tag: "at a moderate speed" },
    Allegretto: { min: 112, max: 120, tag: "moderately fast" },
    "Allegro moderato": { min: 116, max: 120, tag: "close to, but not quite allegro" },
    Allegro: { min: 120, max: 156, tag: "fast, quickly, and bright" },
    Vivace: { min: 156, max: 176, tag: "lively and fast" },
    Vivacissimo: { min: 172, max: 176, tag: "very fast and lively" },
    Allegrissimo: { min: 172, max: 176, tag: "very fast" },
    Presto: { min: 168, max: 200, tag: "very, very fast" },
    Prestissimo: { min: 200, max: 400, tag: "faster than presto" },
}

export const findTempoMarkings = (tempo: number): [string, TempoMarking][] => {
    const markings: [string, TempoMarking][] = [];
    const keys = Object.keys(tempoMarkings);
    for (let i = 0; i < keys.length; i += 1) {
        const ti = tempoMarkings[keys[i]];
        if (tempo >= ti.min && tempo <= ti.max) markings.push([keys[i], ti]);
    }
    return markings;
}

export const frequencies = [
    { A0: 27.5 },
    { "A#0": 29.14 },
    { B0: 30.87 },
    { C1: 32.7 },
    { "C#1": 34.65 },
    { D1: 36.71 },
    { "D#1": 38.89 },
    { E1: 41.2 },
    { F1: 43.65 },
    { "F#1": 46.25 },
    { G1: 49 },
    { "G#1": 51.91 },
    { A1: 55 },
    { "A#1": 58.27 },
    { B1: 61.74 },
    { C2: 65.41 },
    { "C#2": 69.3 },
    { D2: 73.42 },
    { "D#2": 77.78 },
    { E2: 82.41 },
    { F2: 87.31 },
    { "F#2": 92.5 },
    { G2: 98 },
    { "G#2": 103.83 },
    { A2: 110 },
    { "A#2": 116.54 },
    { B2: 123.47 },
    { C3: 130.81 },
    { "C#3": 138.59 },
    { D3: 146.83 },
    { "D#3": 155.56 },
    { E3: 164.81 },
    { F3: 174.61 },
    { "F#3": 185 },
    { G3: 196 },
    { "G#3": 207.65 },
    { A3: 220 },
    { "A#3": 233.08 },
    { B3: 246.94 },
    { C4: 261.63 },
    { "C#4": 277.18 },
    { D4: 293.66 },
    { "D#4": 311.13 },
    { E4: 329.63 },
    { F4: 349.23 },
    { "F#4": 369.99 },
    { G4: 392 },
    { "G#4": 415.3 },
    { A4: 440 },
    { "A#4": 466.16 },
    { B4: 493.88 },
    { C5: 523.25 },
    { "C#5": 554.37 },
    { D5: 587.33 },
    { "D#5": 622.25 },
    { E5: 659.25 },
    { F5: 698.46 },
    { "F#5": 739.99 },
    { G5: 783.99 },
    { "G#5": 830.61 },
    { A5: 880 },
    { "A#5": 932.33 },
    { B5: 987.77 },
    { C6: 1046.5 },
    { "C#6": 1108.73 },
    { D6: 1174.66 },
    { "D#6": 1244.51 },
    { E6: 1318.51 },
    { F6: 1396.91 },
    { "F#6": 1479.98 },
    { G6: 1567.98 },
    { "G#6": 1661.22 },
    { A6: 1760 },
    { "A#6": 1864.66 },
    { B6: 1975.53 },
    { C7: 2093 },
    { "C#7": 2217.46 },
    { D7: 2349.32 },
    { "D#7": 2489.02 },
    { E7: 2637.02 },
    { F7: 2793.83 },
    { "F#7": 2959.96 },
    { G7: 3135.96 },
    { "G#7": 3322.44 },
    { A7: 3520 },
    { "A#7": 3729.31 },
    { B7: 3951.07 },
    { C8: 4186 },
]

export const getNoteFrom = (freq: number): [number, string] => {
    let keys = ['A0', 'A#0', 'B0'];
    for (let i = 1; i < 8; i += 1) {
        keys = keys.concat(
            pitchesFromC.map((item) => `${item}${i}`),
        )
    }
    keys.push('C8');
    const note = hzToNote(freq);
    return [keys.indexOf(note), note];
}


export const getNoteFromString = (string: number, fret: number, tuning: number[]) => {
    const invIdx = (tuning.length - 1) - string;
    const baseNoteDiff = tuning[invIdx];
    const baseNote = getTransposedKey(baseTuning[invIdx], baseNoteDiff);
    const guitarNote = getTransposedKey(baseNote, fret);
    return [guitarNote, STRING_OCTAVE[invIdx]];
}


export const colorMaps = [
    "alpha", "bathymetry", "blackbody", "bone",
    "cubehelix", "earth", "greys", "hot", "hsv",
    "jet", "picnic", "plasma", "portland", "rainbow",
    "rainbow-soft", "rdbu", "viridis", "yignbu", "yiorrd",
] as const;


export class Metronome {
    static sched: unknown = null;
    static ac: AudioContext | null = null;
    static beats: BeatTime[] = [];
    static notes: NoteTime[] = [];
    static noteHitCallback: ((e: unknown) => void) | null = null;
    static synth: unknown;
    static playNote: boolean;
    static tuning: number[];
    static start(beats: BeatTime[]) {
        Metronome.stop();
        Metronome.beats = beats;
        Metronome.ac = MediaPlayerService.getAudioContext();
        if (Metronome.ac) {
            //eslint-disable-next-line
            Metronome.sched = new (WebAudioScheduler as any)({ context: Metronome.ac });
            //eslint-disable-next-line
            const sc = (Metronome.sched as any);

            sc.start(Metronome.schedule);
        }
    }

    static startClapping(notes: NoteTime[], hitCB: typeof Metronome.noteHitCallback, playNote = true, tuning = allTunings.E_Standard) {
        Metronome.stopClapping();
        Metronome.notes = notes;
        Metronome.noteHitCallback = hitCB;
        Metronome.ac = MediaPlayerService.getAudioContext();
        Metronome.synth = new Tone.Synth().toMaster();
        Metronome.playNote = playNote;
        Metronome.tuning = tuning;
        if (Metronome.ac) {
            //eslint-disable-next-line
            Metronome.sched = new (WebAudioScheduler as any)({ context: Metronome.ac });
            //eslint-disable-next-line
            const sc = (Metronome.sched as any);
            sc.start(Metronome.scheduleClap);
        }
    }

    static scheduleClap(e: { playbackTime: number }) {
        if (!MediaPlayerService.isPlaying()) return;
        let t0 = e.playbackTime;
        const cur = MediaPlayerService.getCurrentTime();
        const nextNote = Metronome.notes.find(i => i.startTime >= cur);
        if (nextNote) {
            const nbTime = nextNote.startTime;
            t0 += (nbTime - cur);
            //eslint-disable-next-line
            const sc = (Metronome.sched as any);
            sc.insert(t0 - 0.1, Metronome.clapTrack, { note: nextNote });
            if (Metronome.noteHitCallback) sc.insert(t0 - 0.1, Metronome.noteHitCallback, { startTime: nbTime });
            sc.insert(t0 + 0.1, Metronome.scheduleClap);
        }
    }

    static schedule(e: { playbackTime: number }) {
        let t0 = e.playbackTime;
        const cur = MediaPlayerService.getCurrentTime();
        const nextBeat = Metronome.beats.find(i => parseFloat(i.start) > cur);
        if (nextBeat) {
            const nbTime = parseFloat(nextBeat.start);
            const bn = nextBeat.beatNum;
            t0 += nbTime - cur;
            //eslint-disable-next-line
            const sc = (Metronome.sched as any);
            sc.insert(t0, Metronome.ticktack, { frequency: bn === "1" ? 880 : 440, duration: bn === "1" ? 0.5 : 0.1 })
            sc.insert(t0 + 0.1, Metronome.schedule);
        }
    }

    static clapTrack(e: { playbackTime: number; args: { note: NoteTime } }) {
        if (Metronome.ac) {
            if (Metronome.playNote) {
                const note = e.args.note;
                if (note) {
                    const noteToPlay: (string | number)[] = getNoteFromString(note.string, note.fret, Metronome.tuning);
                    //eslint-disable-next-line
                    (Metronome.synth as any).triggerAttackRelease(`${noteToPlay[0]}${noteToPlay[1]}`, '8n');
                }
                return;
            }
            const t0 = e.playbackTime;
            const source = Metronome.ac.createBufferSource();
            source.buffer = MediaPlayerService.getClapBuffer();
            const g = MediaPlayerService.getGainNode();
            if (g) {
                source.connect(g);
                source.start(t0);
            }
        }
    }

    static ticktack(e: { playbackTime: number; args: { frequency: number; duration: number } }) {
        const t0 = e.playbackTime;
        const t1 = t0 + e.args.duration;
        if (Metronome.ac) {
            const osc = Metronome.ac.createOscillator();
            const amp = Metronome.ac.createGain();
            if (amp) {
                osc.frequency.value = e.args.frequency;
                osc.start(t0);
                osc.stop(t1);
                osc.connect(amp as AudioNode);

                amp.gain.setValueAtTime(0.5, t0);
                amp.gain.exponentialRampToValueAtTime(1e-6, t1);

                const g = MediaPlayerService.getGainNode();
                if (g) amp.connect(g);

                //eslint-disable-next-line
                const sc = (Metronome.sched as any);
                sc.nextTick(t1, () => {
                    osc.disconnect();
                    amp.disconnect();
                });
            }
        }
    }

    static stop() {
        //eslint-disable-next-line
        const sc = (Metronome.sched as any);
        if (sc) {
            sc.stop();
            sc.removeAll();
        }
        Metronome.ac = null;
        Metronome.sched = null;
        Metronome.beats = [];
    }

    static stopClapping() {
        //eslint-disable-next-line
        const sc = (Metronome.sched as any);
        if (sc) {
            sc.stop();
            sc.removeAll();
        }
        Metronome.ac = null;
        Metronome.sched = null;
        Metronome.notes = [];
        Metronome.noteHitCallback = null;
        if (Metronome.synth) {
            //eslint-disable-next-line
            (Metronome.synth as any).disconnect();
            //eslint-disable-next-line
            (Metronome.synth as any).dispose();
        }
        Metronome.synth = null;
    }
}
