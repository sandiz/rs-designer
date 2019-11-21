
import * as teoria from 'teoria';
import {
    ScaleInfo, CircleOfFifths, ChordTime, ChordInfo,
} from '../types';

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

export const pitches = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
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

export const getTransposedKey = (key: string, value: number): string => {
    const index = pitches.indexOf(key);
    if (index !== -1) {
        let diff = index + value;
        if (diff < 0) {
            diff = (pitches.length) - Math.abs(diff);
        }
        else if (diff > pitches.length - 1) {
            diff -= (pitches.length)
        }
        return pitches[diff];
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
