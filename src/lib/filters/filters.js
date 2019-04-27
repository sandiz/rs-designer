
import KaraokeProcessor from './karaoke.worklet'
import SoundTouchProcessor from './soundtouch.worklet'

export const FilterTypes = {
    karaoke: 'karaoke',
    soundtouch: 'soundtouch',
}

export class Filters {
    constructor() {
        this.activeFilters = {}
    }

    createFilter = async (type, backend, options = {}) => {
        if (type in this.activeFilters) {
            return this.activeFilters[type];
        }
        switch (type) {
            case FilterTypes.karaoke:
                try {
                    await backend.ac.audioWorklet.addModule(KaraokeProcessor)
                    const w = new AudioWorkletNode(backend.ac, 'karaoke', {
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
            case FilterTypes.soundtouch:
                try {
                    await backend.ac.audioWorklet.addModule(SoundTouchProcessor);
                    const w = new AudioWorkletNode(backend.ac, 'soundtouch', {
                        numberOfInputs: 2,
                        numberOfOutputs: 1,
                        outputChannelCount: [2],
                    });
                    const buffer = backend.buffer;
                    const channels = buffer.numberOfChannels;
                    const l = buffer.getChannelData(0);
                    const r = channels > 1 ? buffer.getChannelData(1) : l;

                    const SharedBuffers = {
                        left: l,
                        right: r,
                    };
                    w.port.postMessage({
                        SharedBuffers,
                        type: "sharedbuffer",
                    })


                    this.activeFilters[type] = w;
                    return w;
                }
                catch (err) {
                    console.log(err);
                    return null;
                }
            default:
                break;
        }
        return null;
    }
}
const WebAudioFilters = new Filters();
export default WebAudioFilters;
