
import * as teoria from 'teoria';
import {
    ScaleInfo, CircleOfFifths, ChordTime, ChordInfo,
} from '../types';

const rotate = (array: string[], times: number): string[] => {
    const copy = array.slice(0)
    //eslint-disable-next-line
    while (times--) {
        const temp: string | undefined = copy.shift();
        if (temp) copy.push(temp)
    }
    return copy;
}

const rotateMode = (obj: ScaleInfo, times: number) => {
    const copy = { ...obj }
    copy.steps = rotate(copy.steps, times)
    copy.chordType = rotate(copy.chordType, times);
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

export const getTransposedChords = (chords: string[], value: number): string[] => {
    const t = [...chords];
    for (let i = 0; i < t.length; i += 1) {
        const chord = t[i];
        if (chord.endsWith('m')) {
            const key = chord.replace('m', '');
            t[i] = getTransposedKey(key, value) + 'm';
        }
        else if (chord === 'N') {
            t[i] = chord;
        }
        else {
            t[i] = getTransposedKey(t[i], value);
        }
    }
    //console.log(chords, value, t);
    return t;
}

export const getUniqueChords = (chordsAnalysisData: ChordTime[]): string[] => {
    const onlyChords = chordsAnalysisData.map((v) => {
        if (v.type === 'maj') return v.key;
        else if (v.type === 'min') return v.key + "m";
        else {
            return "N";
        }
    })
    const uniq = [...Array.from(new Set(onlyChords))];
    return uniq;
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
