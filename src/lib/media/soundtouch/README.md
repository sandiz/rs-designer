#soundtouch.js

JavaScript audio time-stretching and pitch-shifting library. Based on the C++ implementation of [SoundTouch](http://www.surina.net/soundtouch/ soundtouch).

Built by [Ryan Berdeen](https://github.com/also). `getWebAudioNode` utility written by [Adrian Holovaty](https://github.com/adrianholovaty). User-friendly *PitchShifter* wrapper by [fiala](https://github.com/jakubfiala).

##Setup

+ Include `soundtouch.min.js` in your HTML, or `require('soundtouch-js')` in Node *(Node implementation is incomplete!)*.

##Usage

+ In order to run *PitchShifter,* you need a loaded and decoded `AudioBuffer`
+ After the buffer has been decoded, e.g. in the callback of `AudioContext.decodeAudioData`, create a new `PitchShifter` as follows

```js
	//instantiate pitchshifter
	pitchshifter = new PitchShifter(context, buffer, 1024);
	//set pitch/tempo
	pitchshifter.tempo = 0.75;
	pitchshifter.pitch = 2;
```

+ to begin playback, connect the `PitchShifter` to the WebAudio destination (or another node), and disconnect it to pause.
+ note that `PitchShifter` is a pseudo-node, and cannot be connected *to.*
