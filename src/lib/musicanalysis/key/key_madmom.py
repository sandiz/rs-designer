import argparse
import sys
import os
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label

args = argparse.Namespace()
key = key_prediction_to_label(
    CNNKeyRecognitionProcessor(**vars(args))(sys.argv[1]))
op = key.split(" ")
op.append(1)
print(op)
