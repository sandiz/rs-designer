import os
from madmom.features.tempo import TempoEstimationProcessor, DBNTempoHistogramProcessor, detect_tempo
from madmom.features.beats import RNNBeatProcessor
import madmom
import scipy.stats
import numpy as np


def process(path, args=[]):
    beats = madmom.features.beats.RNNBeatProcessor()(path)
    when_beats = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)(beats)
    m_res = scipy.stats.linregress(np.arange(len(when_beats)), when_beats)

    first_beat = m_res.intercept
    beat_step = m_res.slope

    return 60/beat_step
