const teoria = require('teoria');
/* eslint-disable */

const rotate = (array, times) => {
    const copy = array.slice(0)
    while (times--) {
        var temp = copy.shift();
        copy.push(temp)
    }
    return copy;
}

const rotateMode = (obj, times) => {
    const copy = { ...obj }
    copy.steps = rotate(copy.steps, times)
    copy.chordType = rotate(copy.chordType, times);
    return copy;
}

export const pitches = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
export const pitchesFromC = rotate(pitches, 3); // starts with C
const cof =
{
    majors: [...pitches],
    minors: [...rotate(pitches, 9)],
};
const major_mode = {
    steps: "W W H W W W H".split(" "),
    chordType: ['m', 'm', '', '', 'm', 'dim', '']

}
const minor_mode = rotateMode(major_mode, 5);

export const getChordsInKey = (key, type) => {
    const newSteps = []
    const ltype = type.toLowerCase();
    let mode = null
    switch (ltype) {
        case 'minor':
            mode = minor_mode
            break;
        case 'major':
            mode = major_mode
            break;
        default:
            break;
    }
    const index = pitches.indexOf(key);
    if (index !== -1 && mode) {
        let noteIndex = index;
        mode.steps.map((v, i) => {
            if (v == 'W') noteIndex += 2;
            if (v == 'H') noteIndex += 1

            if (noteIndex >= pitches.length) {
                noteIndex = noteIndex - (pitches.length)
            }
            let newNote = pitches[noteIndex];
            newSteps.push(`${newNote}${mode.chordType[i]}`)
        });
        const last = newSteps.pop()
        newSteps.unshift(last)
        //console.log(`chords in ${key} ${type}: `, newSteps);

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

export const getRelativeKey = (key, type) => {
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

export const getParalleKey = (key, type) => {
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

export const getTransposedChords = (chords, value) => {
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

export const getTransposedKey = (key, value) => {
    const index = pitches.indexOf(key);
    if (index !== -1) {
        let diff = index + value;
        if (diff < 0) {
            diff = (pitches.length) - Math.abs(diff);
        }
        else if (diff > pitches.length - 1) {
            diff = diff - (pitches.length)
        }
        return pitches[diff];
    }
    return null;
}

export const getUniqueChords = (chords_analysis_data) => {
    const onlyChords = chords_analysis_data.map((v, i) => {
        if (v[3] === 'maj') return v[2];
        else if (v[3] === 'min') return v[2] + "m";
        else {
            return "N";
        }
    })
    const uniq = [...new Set(onlyChords)];
    return uniq;
}

export const semitonesForTempoChange = (start_bpm, end_bpm) => {
    return Math.round((Math.log(end_bpm / start_bpm) / 0.05776227) * 100) / 100;     // calculate math function
}

export const getChordInfo = async (chord, type, origtype) => {
    try {
        const ct = `${chord.toUpperCase()}${type.toLowerCase()}`;
        const c = require(`chords/packages/chord-chart/guitar/${ct}.json`);

        const ct2 = `${chord.toUpperCase()}${origtype.toLowerCase()}`;
        c.notes = teoria.chord(ct2).simple();
        return c;
    }
    catch (ex) {
        return null;
    }
}

export const C1_Hz = 32.70319566257483;
export const C8_Hz = 4186.009044809578;

export const hz_to_note = (freq) => {
    return midi_to_note(hz_to_midi(freq));
}

export const hz_to_midi = (freq) => {
    return 12 * (Math.log2(freq) - Math.log2(440.0)) + 69;
}

export const midi_to_note = (midi) => {
    const note_num = parseInt(Math.round(midi));
    let note = pitchesFromC[note_num % 12];
    note = `${note}${parseInt(note_num / 12) - 1}`;
    return note;
}

export const note_to_hz = (note) => {
    return midi_to_hz(note_to_midi(note));
}

export const midi_to_hz = (midi) => {
    return 440.0 * (2.0 ** ((midi - 69) / 12.0));
}

export const note_to_midi = (note, round_midi = true) => {
    const pitch_map = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const acc_map = { '#': 1, '': 0, 'b': -1, '!': -1 };

    const regex = /([A-Ga-g])([#b!]*)([+-]?\d+)?([+-]\d+)?$/gm;
    const match = regex.exec(note);
    const pitch = match[1];
    const accidental = match[2]
    let offset = 0;
    for (let i = 0; i < accidental.length; i++) {
        const c = (accidental.charAt(i));
        offset += acc_map[c];
    }
    let octave = match[3]
    let cents = match[4]

    if (octave) octave = parseInt(octave)
    else octave = 0;

    if (cents) cents = parseInt(cents) * 1e-2;
    else cents = 0;

    let note_value = 12 * (octave + 1) + pitch_map[pitch] + offset + cents;

    if (round_midi) note_value = parseInt(Math.round(note_value));
    return note_value;
}