from essentia.standard import PercivalBpmEstimator, MonoLoader
import essentia
import sys
import json
essentia.log.infoActive = False
essentia.log.warningActive = False
y = MonoLoader(filename=sys.argv[1])()
bpm = PercivalBpmEstimator()(y)
print(bpm)
