import sys
import numpy as np
from essentia.standard import *
from madmom.features import RNNBarProcessor, DBNBarTrackingProcessor


def process(path, args=[]):
    # Loading audio file
    audio = MonoLoader(filename=path)()
    # Compute beat positions and BPM
    rhythm_extractor = RhythmExtractor2013(method="multifeature")
    bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)

    beats = np.round(beats, 3)
    in_processor = RNNBarProcessor(fps=50)((path, beats))
    beats_processor = DBNBarTrackingProcessor(beats_per_bar=[3, 4], fps=50)
    beats = beats_processor(in_processor)
    beats = np.round(beats, 3)
    return beats.tolist()
