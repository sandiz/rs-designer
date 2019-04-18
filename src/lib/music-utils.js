/* eslint-disable */
const pitches = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']

const rotate = (array, times) => {
    const copy = array.slice(0)
    while (times--) {
        var temp = copy.shift();
        copy.push(temp)
    }
    return copy;
}

const cof =
{
    majors: [...pitches],
    minors: [...rotate(pitches, 9)],
};


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

export const getTransposedKey = (key, value) => {
    const index = pitches.indexOf(key);
    if (index !== -1) {
        let diff = index + value;
        if (diff < 0) {
            diff = (pitches.length) - Math.abs(diff);
        }
        else if (diff > pitches.length - 1) {
            diff = diff - (pitches.length - 1)
        }
        return pitches[diff];
    }
    return null;
}
