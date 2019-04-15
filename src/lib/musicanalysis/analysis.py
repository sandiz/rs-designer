from __future__ import print_function
import numpy as np
import sys
import madmom
from madmom.audio import SignalProcessor, DeepChromaProcessor
from madmom.features import DeepChromaChordRecognitionProcessor
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label
import argparse
import librosa
import time
import threading
import os
np.set_printoptions(precision=3)


def beats_librosa(y, sr, onset_env):
    tempo3, beats_track = librosa.beat.beat_track(
        onset_envelope=onset_env, y=y, sr=sr)
    beats_cqt = librosa.frames_to_time(beats_track, sr=sr)

    path = os.path.join(sys.argv[2], "tempo")
    with open(path, 'w') as file:
        file.write(str(tempo3.tolist()))

    path = os.path.join(sys.argv[2], "beats")
    with open(path, 'w') as file:
        for beat in beats_cqt.tolist():
            file.write("%s\n" % beat)
    print("finished librosa:beats")


def cqt_librosa(y, sr):
    b_p_o = 12 * 3
    n_bins = 7 * b_p_o
    C = librosa.cqt(
        y=y,
        sr=sr,
        bins_per_octave=b_p_o,
        n_bins=n_bins,
    )
    dB = librosa.amplitude_to_db(np.abs(C), ref=np.max)
    mode = 'dump'
    # if mode == 'dump':
    path = os.path.join(sys.argv[2], "cqt")
    np.save(path, dB)
    print("finished librosa:cqt")
    # np.savez_compressed("cqt", dB=dB)
    '''
    else:
        # H, P = librosa.decompose.hpss(D, margin=10.0)
        # C = np.abs()
        # dB = librosa.amplitude_to_db(C, ref=np.max)

        # inferno/magma/hot
        cmap = "viridis"
        plt.figure(figsize=(20, 4))
        # plt.subplot(2, 1, 1)
        librosa.display.specshow(
            dB,
            y_axis='cqt_note',
            x_axis='time',
            bins_per_octave=b_p_o,
            cmap=cmap,
            fmin=librosa.core.note_to_hz('C2'),
        )
        plt.tight_layout()
        plt.show()
    '''


def key_detect_madmom():
    args = argparse.Namespace()
    key = key_prediction_to_label(
        CNNKeyRecognitionProcessor(**vars(args))(sys.argv[1]))
    path = os.path.join(sys.argv[2], "key")
    with open(path, 'w') as file:
        file.write(key)
    print("finished madmom:key detect")


def chords_detect_madmom():
    args = argparse.Namespace()
    in_processor = DeepChromaProcessor(**vars(args))(sys.argv[1])
    chord_processor = DeepChromaChordRecognitionProcessor(**vars(args))
    chords = chord_processor(in_processor)
    path = os.path.join(sys.argv[2], "chords")
    with open(path, 'w') as file:
        for chord in chords.tolist():
            file.write("%s,%s,%s\n" % (chord[0], chord[1], chord[2]))
    print("finished madmom:chords detect")


def thread_librosa():
    print("starting librosa thread")
    y, sr = librosa.load(sys.argv[1])
    onset_env = librosa.onset.onset_strength(y, sr=sr)
    print("finished librosa load")
    t1 = threading.Thread(target=cqt_librosa, args=(y, sr,))
    #t2 = threading.Thread(target=tempo2_librosa, args=(y, sr, onset_env))
    t3 = threading.Thread(target=beats_librosa, args=(y, sr, onset_env))

    t1.start()
    # t2.start()
    t3.start()

    # t2.join()
    t1.join()
    t3.join()
    pass


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("args: music file")
        sys.exit(0)
    start = time.time()
    t1 = threading.Thread(target=thread_librosa)
    t3 = threading.Thread(target=key_detect_madmom)
    t4 = threading.Thread(target=chords_detect_madmom)

    t1.start()
    t3.start()
    t4.start()

    t3.join()
    t4.join()
    t1.join()
    end = time.time()
    print("\nTotal time: " + str(end - start) + " s")
