import { SoundTouch, SimpleFilter } from "soundtouchjs";

/* eslint-disable */
export default class SoundTouchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.samples = new Float32Array(this.bufferSize * 2);
        this.initialized = false;
        this.port.onmessage = this._initializeOnEvent.bind(this);

        this._initsab.bind(this);
        this.process.bind(this);
    }

    _initializeOnEvent(eventFromWorker) {
        console.log(eventFromWorker)
        switch (eventFromWorker.data.type) {
            case "sharedbuffer":
                this._initsab(eventFromWorker);
                break;
            case "update":
                //this.st.tempo = eventFromWorker.data.tempo;
                //this.st.pitchSemitones = eventFromWorker.data.pitchSemitones;
                this.seekingPos = eventFromWorker.data.seekingPos;
                this.length = eventFromWorker.data.length;
                break;
        }

    }

    _initsab(eventFromWorker) {
        this.sharedBuffers = eventFromWorker.data.SharedBuffers;
        this.seekingPos = null;
        this.seekingDiff = null;
        this.source = {
            extract: function (target, numFrames, position) {
                if (this.seekingPos != null) {
                    this.seekingDiff = this.seekingPos - position;
                    this.seekingPos = null;
                }

                position += this.seekingDiff;
                for (let i = 0; i < numFrames; i += 1) {
                    target[i * 2] = this.sharedBuffers.left[i + position];
                    target[i * 2 + 1] = this.sharedBuffers.right[i + position];
                }
                return Math.min(numFrames, this.length - position);
            }.bind(this),
        };
        this.st = new SoundTouch()
        this.filter = new SimpleFilter(this.source, this.st);
        this.initialized = true;
    }

    pass_process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const gain = parameters.gain;
        for (let channel = 0; channel < input.length; ++channel) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];
            if (true) { // gain.length === 1) {
                for (let i = 0; i < inputChannel.length; ++i)
                    outputChannel[i] = inputChannel[i] * 1;// gain[0];
            } else {
                for (let i = 0; i < inputChannel.length; ++i)
                    outputChannel[i] = inputChannel[i] * gain[i];
            }
        }

        return true;
    }

    process(inputs, outputs, params) {
        if (!this.initialized) return true;
        //this.pass_process(inputs, outputs, params)
        //return true;

        const input = inputs[0]
        const output = outputs[0]

        const inputL = input[0];
        const inputR = input[1];

        const outputL = output[0];
        const outputR = output[1];

        const framesExtracted = this.filter.extract(this.samples, this.bufferSize);
        if (framesExtracted === 0)
            this.filter.onEnd();

        for (let i = 0; i < framesExtracted; i += 1) {
            outputL[i] = this.samples[i * 2];
            outputR[i] = this.samples[i * 2 + 1];
        }
        return true;
    }
}

registerProcessor('soundtouch', SoundTouchProcessor);
