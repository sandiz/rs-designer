
import KaraokeProcessor from './karaoke.worklet'

export const FilterTypes = {
    karaoke: 'karaoke',
}

export class Filters {
    constructor() {
        this.activeFilters = {}
    }

    createFilter = async (type, context) => {
        switch (type) {
            case FilterTypes.karaoke:
                if (type in this.activeFilters) {
                    return this.activeFilters[type];
                }
                else {
                    try {
                        await context.audioWorklet.addModule(KaraokeProcessor)
                        const w = new AudioWorkletNode(context, 'karaoke', {
                            numberOfInputs: 2,
                            numberOfOutputs: 1,
                            outputChannelCount: [2],
                        });
                        this.activeFilters[type] = w;
                        return w;
                    }
                    catch (err) {
                        console.log(err)
                        return null;
                    }
                }
            default:
                break;
        }
        return null;
    }
}
const WebAudioFilters = new Filters();
export default WebAudioFilters;
