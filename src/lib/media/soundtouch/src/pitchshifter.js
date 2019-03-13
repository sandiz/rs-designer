function PitchShifter (ctx, buffer, bufSize) {
	this._st = new SoundTouch();
    this._f = new SimpleFilter(new WebAudioBufferSource(buffer), this._st, bufSize);
    this._node = getWebAudioNode(ctx, this._f);
}

PitchShifter.prototype.connect = function(toNode) {
	this._node.connect(toNode);
}

PitchShifter.prototype.disconnect = function(toNode) {
	this._node.disconnect();
}

extend(PitchShifter.prototype, {
	set pitch(p) {
		this._st.pitch = p;
	},
	set rate(r) {
		this._st.rate = r;
	},
	set tempo(t) {
		this._st.tempo = t;
	}
});
