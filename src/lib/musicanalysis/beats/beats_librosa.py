import sys
import librosa
import numpy as np
from madmom.features import RNNBarProcessor, DBNBarTrackingProcessor


def process(path, args=[]):
    y, sr = librosa.load(path, sr=None)
    onset_env = librosa.onset.onset_strength(y, sr=44100)

    tempo3, beats_track = librosa.beat.beat_track(
        onset_envelope=onset_env, y=y, sr=sr)
    beats_cqt = librosa.frames_to_time(beats_track, sr=sr)

    beats = np.round(beats_cqt, 3)
    in_processor = RNNBarProcessor(fps=50)((path, beats))
    beats_processor = DBNBarTrackingProcessor(beats_per_bar=[3, 4], fps=50)
    beats = beats_processor(in_processor)

    return beats.tolist()