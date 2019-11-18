import sys
import librosa
import json
import numpy as np
from madmom.features import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor

in_processor = RNNDownBeatProcessor()(sys.argv[1])
beats_processor = DBNDownBeatTrackingProcessor(beats_per_bar=[3, 4], fps=50)
beats = beats_processor(in_processor)


print(json.dumps(beats.tolist()))
# pdb.set_trace()
