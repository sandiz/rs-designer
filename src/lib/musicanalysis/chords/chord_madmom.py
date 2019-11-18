import argparse
from madmom.features import DeepChromaChordRecognitionProcessor
from madmom.audio import DeepChromaProcessor
import sys
import json

args = argparse.Namespace()
in_processor = DeepChromaProcessor(**vars(args))(sys.argv[1])
chord_processor = DeepChromaChordRecognitionProcessor(**vars(args))
chords = chord_processor(in_processor)
print(json.dumps(chords.tolist()))
