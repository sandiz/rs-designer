from __future__ import division
import numpy as np
import sys
import madmom
from madmom.audio import SignalProcessor, DeepChromaProcessor
from madmom.features import DeepChromaChordRecognitionProcessor, DBNDownBeatTrackingProcessor, RNNDownBeatProcessor, RNNBarProcessor, DBNBarTrackingProcessor
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label
import argparse
import time
import os
import cairo
from scipy.signal import resample
import time
from essentia.standard import KeyExtractor, MonoLoader
import librosa
import librosa.display

import tempfile
os.environ['LIBROSA_CACHE_DIR'] = tempfile.gettempdir() + '/librosa_cache'
os.environ['LIBROSA_CACHE_LEVEL'] = '50'


def draw(dB, width, height, file):
    print("exporting to (" + str(width) + " " + str(height) + ")")
    pixels = dB
    heightFactor = 4.2

    surface = cairo.ImageSurface(cairo.FORMAT_RGB24, width, height)
    ctx = cairo.Context(surface)
    start = time.time()

    import matplotlib.colors
    import matplotlib.cm
    norm = matplotlib.colors.Normalize(vmin=0, vmax=255)
    pnorm = norm(pixels)
    cmap = matplotlib.cm.get_cmap('RdBu')
    newcolors = cmap(pixels)

    # RdYlGn,Spectral, RdGy, PuOr, RdBu
    # import pdb
    # pdb.set_trace()
    for i in range(len(pixels)):
        for j in range(len(pixels[i])):
            r = newcolors[i][j][0]
            g = newcolors[i][j][1]
            b = newcolors[i][j][2]
            ctx.set_source_rgb(r, g, b)
            ctx.rectangle(
                i, height - (j*heightFactor), 1, heightFactor)
            ctx.fill()

    print("pixel draw took " + str(time.time() - start))

    start = time.time()
    surface.write_to_png(file + ".png")  # Output to PNG
    print("write png took " + str(time.time() - start))

    #start = time.time()
    #data = surface.get_data()
    #f = open(file, "w")
    # f.write(data)
    # f.close()
    #print ("write raw took " + str(time.time() - start))


def export_to_png(dB, width, height, file, shdresample=True):
    newdB = np.swapaxes(dB, 0, 1)
    # newdB = _resample(newdB, width)
    # zoomdB = scipy.ndimage.zoom(newdB, width/len(newdB))
    start = time.time()
    if shdresample:
        zoomdB = resample(newdB, width)
    else:
        zoomdB = newdB
    zoomdB2 = np.uint8(zoomdB)
    print("resampling took " + str(time.time() - start))
    draw(zoomdB2, width, height, file)


def beats_librosa(y, sr, onset_env):
    start = time.time()
    tempo3, beats_track = librosa.beat.beat_track(
        onset_envelope=onset_env, y=y, sr=sr)
    beats_cqt = librosa.frames_to_time(beats_track, sr=sr)

    path = os.path.join(sys.argv[2], "tempo")
    with open(path, 'w') as file:
        file.write(str(tempo3.tolist()))

    path = os.path.join(sys.argv[2], "beats_track")
    with open(path, 'w') as file:
        for beat in beats_cqt.tolist():
            file.write("%s\n" % beat)
    print("finished librosa:beats took " + str(time.time() - start) + "s")


def cqt_essentia(y, sr, wavpath):
    import essentia.standard as standard
    y = standard.MonoLoader(filename=wavpath)()
    kwargs = {
        'inputSize': 512,
        'minFrequency': 65.41,
        'maxFrequency': 6000,
        'binsPerOctave': 12 * 3,
        'sampleRate': sr,
        'rasterize': 'full',
        'phaseMode': 'global',
        'gamma': 10,
        'normalize': 'none',
        'window': 'hannnsgcq',
    }
    start = time.time()
    kwargs['inputSize'] = len(y)
    CQStand = standard.NSGConstantQ(**kwargs)
    C, dcchannel, nfchannel = CQStand(y)

    dB = librosa.amplitude_to_db(np.abs(C), ref=np.max)
    oldWidth = C.shape[1]
    #newWidth = int(sys.argv[3]) if len(sys.argv) >= 5 else C.shape[1]
    newWidth = oldWidth

    mode = 'dump'
    # if mode == 'dump':
    path = os.path.join(sys.argv[2], "cqt.raw")
    # np.save(path, dB)
    newHeight = int(sys.argv[4]) if len(sys.argv) >= 5 else C.shape[0]

    print("cqt essentia took " + str(time.time() - start))

    print("oldWidth: {} newWidth: {}".format(oldWidth, newWidth))

    newdB = np.empty([dB.shape[0], newWidth])
    from scipy.ndimage import zoom
    for i in range(len(dB)):
        newdB[i] = zoom(dB[i], float(newWidth) / float(oldWidth))

    export_to_png(newdB, newWidth, newHeight, path, False)


def cqt_librosa(y, sr):
    start = time.time()
    b_p_o = 12 * 3
    n_bins = 7 * b_p_o
    C = librosa.hybrid_cqt(
        y=y,
        sr=sr,
        bins_per_octave=b_p_o,
        n_bins=n_bins,
        # sparsity=0.9
    )
    start = time.time()
    H, P = librosa.decompose.hpss(C, margin=(3.0, 1.0))
    print("decompose analysis took " + str(time.time() - start))
    dB = librosa.amplitude_to_db(np.abs(H), ref=np.max)
    #import matplotlib.pyplot as plt
    #plt.figure(figsize=(12, 4))
    #plt.subplot(2, 1, 1)
    #librosa.display.specshow(dB, y_axis='cqt_note', bins_per_octave=12*3)
    #plt.subplot(2, 1, 2)
    #librosa.display.specshow(dB, y_axis='cqt_hz', bins_per_octave=12*3)
    # plt.tight_layout()
    # plt.show()

    print("cqt analysis took " + str(time.time() - start))
    oldWidth = C.shape[1]
    newWidth = int(sys.argv[3]) if len(sys.argv) >= 5 and int(
        sys.argv[3]) != -1 else C.shape[1]

    mode = 'dump'
    # if mode == 'dump':
    path = os.path.join(sys.argv[2], "cqt.raw")
    # np.save(path, dB)
    newHeight = int(sys.argv[4]) if len(sys.argv) >= 5 else C.shape[0]

    print("oldWidth: {} newWidth: {}".format(oldWidth, newWidth))
    export_to_png(dB, newWidth, newHeight, path, not (newWidth == oldWidth))
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


def downbeat_detact_madmom(path):
    start = time.time()
    args = argparse.Namespace()
    beats = np.round(np.loadtxt(os.path.join(sys.argv[2], "beats_track")), 3)
    in_processor = RNNBarProcessor(fps=50)((path, beats))
    beats_processor = DBNBarTrackingProcessor(beats_per_bar=[3, 4], fps=50)

    #in_processor = RNNDownBeatProcessor(**vars(args))(path)
    # beats_processor = DBNDownBeatTrackingProcessor(
    #    beats_per_bar=[3, 4], fps=100)
    beats = beats_processor(in_processor)
    path = os.path.join(sys.argv[2], "beats")

    madmom.io.write_beats(beats, path)
    print("finished madmom:downbeat detect " + str(time.time() - start) + "s")


def key_detect_madmom(path):
    start = time.time()
    args = argparse.Namespace()
    key = key_prediction_to_label(
        CNNKeyRecognitionProcessor(**vars(args))(path))
    path = os.path.join(sys.argv[2], "key")
    with open(path, 'w') as file:
        file.write(key)
    print("finished madmom:key detect took " + str(time.time() - start) + " s")


def key_detect_essentia(y):
    start = time.time()
    a = KeyExtractor()(y)
    import json
    path = os.path.join(sys.argv[2], "key")
    with open(path, 'w') as file:
        file.write(json.dumps(a))
    print("finished essentia:key detect took " +
          str(time.time() - start) + " s")


def chords_detect_madmom(path):
    start = time.time()
    args = argparse.Namespace()
    in_processor = DeepChromaProcessor(**vars(args))(path)
    chord_processor = DeepChromaChordRecognitionProcessor(**vars(args))
    chords = chord_processor(in_processor)
    path = os.path.join(sys.argv[2], "chords")
    with open(path, 'w') as file:
        for chord in chords.tolist():
            file.write("%s,%s,%s\n" % (chord[0], chord[1], chord[2]))
    print("finished madmom:chords detect took " +
          str(time.time() - start) + " s")


def thread_librosa(y, sr):
    print("starting librosa thread")
    onset_env = librosa.onset.onset_strength(y, sr=sr)
    #t1 = threading.Thread(target=cqt_librosa, args=(y, sr,))
    #t3 = threading.Thread(target=beats_librosa, args=(y, sr, onset_env))

    # t1.start()
    # t3.start()
    # t1.join()
    # t3.join()


if __name__ == '__main__':
    if len(sys.argv) <= 2:
        print("args: file dir width")
        sys.exit(0)
    start = time.time()
    print("librosa load/decode")
    y, sr = librosa.load(sys.argv[1], sr=None)
    wavpath = os.path.join(sys.argv[2], "media.wav")

    y_hat = librosa.core.resample(y, sr, 44100, res_type='kaiser_fast')
    librosa.output.write_wav(wavpath, y_hat, 44100)

    print("librosa decode took " + str(time.time() - start))

    onset_env = librosa.onset.onset_strength(y_hat, sr=44100)
    cqt_librosa(y_hat, 44100)
    beats_librosa(y_hat, 44100, onset_env)

    key_detect_essentia(y_hat)
    chords_detect_madmom(wavpath)
    downbeat_detact_madmom(wavpath)
    #t1 = threading.Thread(target=thread_librosa, args=(y_hat, 44100))
    #t3 = threading.Thread(target=key_detect_essentia, args=(y_hat, ))
    #t4 = threading.Thread(target=chords_detect_madmom, args=(wavpath, ))
    #t5 = threading.Thread(target=downbeat_detact_madmom, args=(wavpath, ))

    #cqt_librosa(y_hat, 441000)
    #cqt_essentia(y_hat, 44100, wavpath)
    # sys.exit(0)

    # t1.start()
    # t1.join()
    # t3.start()
    # t4.start()
    # t5.start()

    # t3.join()
    # t4.join()
    # t5.join()
    os.unlink(wavpath)
    print("\nTotal time: " + str(time.time() - start) + " s")
