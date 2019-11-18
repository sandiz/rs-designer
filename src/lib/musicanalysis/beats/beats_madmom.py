import librosa
import numpy as np
from madmom.features import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor


def process(path, args=[]):
    in_processor = RNNDownBeatProcessor()(path)
    beats_processor = DBNDownBeatTrackingProcessor(
        beats_per_bar=[3, 4], fps=50)
    beats = beats_processor(in_processor)

    return beats.tolist()
