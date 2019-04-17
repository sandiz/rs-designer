export default class KaraokeProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, params) {
        const input = inputs[0]
        const output = outputs[0]

        const inputL = input[0];
        const inputR = input[1];

        const outputL = output[0];
        const outputR = output[1];

        const len = inputL.length;
        for (let i = 0; i < len; i += 1) {
            if (inputL[i]) {
                const diff = (inputL[i] - inputR[i]) / 2;
                outputL[i] = diff
                outputR[i] = diff
            }
        }
        // this method gets automatically called with a buffer of 128 frames
        // audio process goes here
        // if you don't return true, webaudio will stop calling your process method

        return true;
    }
}

registerProcessor('karaoke', KaraokeProcessor);
