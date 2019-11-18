import argparse
import sys
import os
from madmom.features.tempo import TempoEstimationProcessor, DBNTempoHistogramProcessor, detect_tempo
from madmom.features.beats import RNNBeatProcessor
import madmom
import scipy.stats
import numpy as np

beats = madmom.features.beats.RNNBeatProcessor()(sys.argv[1])
when_beats = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)(beats)
m_res = scipy.stats.linregress(np.arange(len(when_beats)), when_beats)

first_beat = m_res.intercept
beat_step = m_res.slope

print(str(60/beat_step))
