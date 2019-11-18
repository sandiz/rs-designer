import sys
import os
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label


def process(file, args=[]):
    key = key_prediction_to_label(
        CNNKeyRecognitionProcessor()(file))
    op = key.split(" ")
    op.append(-1)
    return op
