from essentia.standard import RhythmExtractor2013, MonoLoader
import sys
import json
y = MonoLoader(filename=sys.argv[1])()
rhythm_extractor = RhythmExtractor2013(method="multifeature")
bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(y)
print(bpm)
