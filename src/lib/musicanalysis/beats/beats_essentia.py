import sys
import numpy as np
import json
from essentia.standard import *
from madmom.features import RNNBarProcessor, DBNBarTrackingProcessor

# Loading audio file
audio = MonoLoader(filename=sys.argv[1])()

# Compute beat positions and BPM
rhythm_extractor = RhythmExtractor2013(method="multifeature")
bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)

beats = np.round(beats, 3)
in_processor = RNNBarProcessor(fps=50)((sys.argv[1], beats))
beats_processor = DBNBarTrackingProcessor(beats_per_bar=[3, 4], fps=50)
beats = beats_processor(in_processor)
beats = np.round(beats, 3)
print(json.dumps(beats.tolist()))
