import argparse
from madmom.features import DeepChromaChordRecognitionProcessor
from madmom.audio import DeepChromaProcessor
import sys
import json


def process(file, args=[]):
    args = argparse.Namespace()
    in_processor = DeepChromaProcessor()(file)
    chord_processor = DeepChromaChordRecognitionProcessor()
    chords = chord_processor(in_processor)
    return(chords.tolist())
