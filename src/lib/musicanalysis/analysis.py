from __future__ import print_function
import numpy as np
import sys
import pdb
from madmom.audio import SignalProcessor, DeepChromaProcessor
from madmom.features import (ActivationsProcessor,
                             RNNDownBeatProcessor,
                             DBNDownBeatTrackingProcessor,
                             DeepChromaChordRecognitionProcessor,
                             TempoEstimationProcessor)
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label
import argparse
import librosa
import time
import threading
# import librosa.display
# import matplotlib.pyplot as plt
cqt = key = chords = beats = tempo = tempo_cqt = tempo3 = beats_cqt = None


def time_func(message, func, *args):
    start = time.time()
    ret = func(*args)
    end = time.time()
    print(message + " took: " + str(end - start) + " s")
    return ret


def seq_rosa():
    y, sr = time_func("librosa load", librosa.load, sys.argv[1])
    onset_env = librosa.onset.onset_strength(y, sr=sr)
    time_func("librosa cqt", cqt_librosa, y, sr)
    time_func("librosa tempo", tempo2_librosa, y, sr, onset_env)
    time_func("librosa beats", beats_librosa, y, sr, onset_env)


def tempo2_librosa(y, sr, onset_env):
    tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)
    print("finished librosa:tempo")


def beats_librosa(y, sr, onset_env):
    tempo3, beats_track = librosa.beat.beat_track(
        onset_envelope=onset_env, y=y, sr=sr)
    beats_cqt = librosa.frames_to_time(beats_track, sr=sr)
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
    cqt = dB
    np.save("cqt.npy", dB)
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


def seq_madmom():
    args = argparse.Namespace()
    rnn = RNNDownBeatProcessor(**vars(args))
    in_processor = time_func("libmadmom load", rnn, sys.argv[1])
    time_func("libmadmom tempo", tempo_madmom, in_processor)
    time_func("libmadmom beats", beats_madmom, in_processor)
    time_func("libmadmom key", key_detect_madmom)
    time_func("libmadmom chords", chords_detect_madmom)


def key_detect_madmom():
    args = argparse.Namespace()
    key = key_prediction_to_label(
        CNNKeyRecognitionProcessor(**vars(args))(sys.argv[1]))
    print("finished madmom:key detect")


def chords_detect_madmom():
    args = argparse.Namespace()
    in_processor = DeepChromaProcessor(**vars(args))(sys.argv[1])
    chord_processor = DeepChromaChordRecognitionProcessor(**vars(args))
    chords = chord_processor(in_processor)
    print("finished madmom:chords detect")


def beats_madmom(in_processor):
    p = argparse.Namespace()
    setattr(p, "norm", False)
    setattr(p, "gain", 0)
    setattr(p, "fps", 100)
    setattr(p, "beats_per_bar", [3, 4])
    args = p
    # in_processor = RNNDownBeatProcessor(**vars(args))(sys.argv[1])
    dbb_estimator = DBNDownBeatTrackingProcessor(**vars(args))
    beats = dbb_estimator(in_processor)
    print("finished madmom:beats ")
    # print(beats)


def tempo_madmom(in_processor):
    p = argparse.Namespace()
    setattr(p, "norm", False)
    setattr(p, "gain", 0)
    setattr(p, "fps", 100)
    setattr(p, "method", "comb")
    setattr(p, "min_bpm", 40)
    setattr(p, "max_bpm", 250)
    setattr(p, "act_smooth", 0.14)
    setattr(p, "hist_smooth", 9)
    setattr(p, "hist_buffer", 10)
    setattr(p, "alpha", 0.79)
    setattr(p, "fps", 100)
    args = p
    # in_processor = RNNBeatProcessor(**vars(args))(sys.argv[1])
    # in_processor = RNNDownBeatProcessor(**vars(args))(sys.argv[1])
    in_processor = in_processor[:, 0]
    tempo_estimator = TempoEstimationProcessor(**vars(args))
    tempi = tempo_estimator(in_processor)
    tempi = np.array(tempi, ndmin=2)
    # default values
    t1 = t2 = strength = np.nan
    # only one tempo was detected
    if len(tempi) == 1:
        t1 = tempi[0][0]
        strength = 1.
    # consider only the two strongest tempi and strengths
    elif len(tempi) > 1:
        t1, t2 = tempi[:2, 0]
        strength = tempi[0, 1] / sum(tempi[:2, 1])
    tempo = np.array([t1, t2, strength], ndmin=1)
    print("finished madmom:tempo")


def thread_librosa():
    print("starting librosa thread")
    y, sr = librosa.load(sys.argv[1])
    onset_env = librosa.onset.onset_strength(y, sr=sr)
    print("finished librosa load")
    t1 = threading.Thread(target=cqt_librosa, args=(y, sr,))
    t2 = threading.Thread(target=tempo2_librosa, args=(y, sr, onset_env))
    t3 = threading.Thread(target=beats_librosa, args=(y, sr, onset_env))

    t1.start()
    t2.start()
    t3.start()

    t2.join()
    t1.join()
    t3.join()
    pass


def thread_madmom_beats():
    print("starting madmom beats thread")
    args = argparse.Namespace()
    rnn = RNNDownBeatProcessor(**vars(args))
    in_processor = rnn(sys.argv[1])
    print ("finished rnn")

    t1 = threading.Thread(target=tempo_madmom, args=(in_processor,))
    t2 = threading.Thread(target=beats_madmom, args=(in_processor,))

    t1.start()
    t2.start()

    t1.join()
    t2.join()
    pass


def sequential_benchmark():
    t1 = time.time()
    seq_rosa()
    t2 = time.time()
    print("librosa total: " + str(t2 - t1) + " s")
    print("\n")
    t1 = time.time()
    seq_madmom()
    t2 = time.time()
    print("libmadmom total: " + str(t2 - t1) + " s")


if __name__ == '__main__':
    start = time.time()
    t1 = threading.Thread(target=thread_librosa)
    #t2 = threading.Thread(target=thread_madmom_beats)
    t3 = threading.Thread(target=key_detect_madmom)
    t4 = threading.Thread(target=chords_detect_madmom)

    t1.start()
    # t2.start()
    t3.start()
    t4.start()

    # t2.join()
    t3.join()
    t4.join()
    t1.join()
    end = time.time()
    print("\nTotal time: " + str(end - start) + " s")
