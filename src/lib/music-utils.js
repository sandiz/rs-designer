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
