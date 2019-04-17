from __future__ import print_function
from __future__ import division
import numpy as np
import sys
import madmom
from madmom.audio import SignalProcessor, DeepChromaProcessor
from madmom.features import DeepChromaChordRecognitionProcessor
from madmom.features.key import CNNKeyRecognitionProcessor, key_prediction_to_label
import argparse
import time
import threading
import os
import cairo
from scipy.signal import resample
import time


bone_cmap = [[255, 255, 255], [254, 254, 254], [253, 253, 253], [252, 252, 252], [251, 251, 251], [250, 250, 250], [249, 249, 249], [248, 248, 248], [247, 247, 247], [246, 246, 246], [245, 245, 245], [244, 244, 244], [243, 243, 243], [242, 242, 242], [241, 241, 241], [240, 240, 240], [239, 239, 239], [238, 238, 238], [237, 237, 237], [236, 236, 236], [235, 235, 235], [234, 234, 234], [233, 233, 233], [232, 232, 232], [231, 231, 231], [230, 230, 230], [229, 229, 229], [228, 228, 228], [227, 227, 227], [226, 226, 226], [225, 225, 225], [224, 224, 224], [223, 223, 223], [222, 222, 222], [221, 221, 221], [220, 220, 220], [219, 219, 219], [218, 218, 218], [217, 217, 217], [216, 216, 216], [215, 215, 215], [214, 214, 214], [213, 213, 213], [213, 213, 213], [212, 212, 212], [211, 211, 211], [210, 210, 210], [209, 209, 209], [208, 208, 208], [207, 207, 207], [206, 206, 206], [205, 205, 205], [204, 204, 204], [203, 203, 203], [202, 202, 202], [201, 201, 201], [200, 200, 200], [199, 199, 199], [198, 198, 198], [197, 197, 197], [196, 196, 196], [195, 195, 195], [193, 193, 193], [192, 192, 192], [191, 191, 191], [190, 190, 190], [189, 189, 189], [188, 188, 188], [187, 187, 187], [186, 186, 186], [185, 185, 185], [184, 184, 184], [183, 183, 183], [182, 182, 182], [181, 181, 181], [180, 180, 180], [179, 179, 179], [178, 178, 178], [177, 177, 177], [176, 176, 176], [175, 175, 175], [174, 174, 174], [173, 173, 173], [172, 172, 172], [171, 171, 171], [170, 170, 170], [169, 169, 169], [168, 168, 168], [167, 167, 167], [166, 166, 166], [165, 165, 165], [164, 164, 164], [163, 163, 163], [162, 162, 162], [161, 161, 161], [160, 160, 160], [159, 159, 159], [158, 158, 158], [157, 157, 157], [156, 156, 156], [155, 155, 155], [154, 154, 154], [153, 153, 153], [152, 152, 152], [151, 151, 151], [150, 150, 150], [149, 149, 149], [148, 148, 148], [147, 147, 147], [146, 146, 146], [145, 145, 145], [144, 144, 144], [143, 143, 143], [142, 142, 142], [141, 141, 141], [140, 140, 140], [139, 139, 139], [138, 138, 138], [
    137, 137, 137], [136, 136, 136], [135, 135, 135], [134, 134, 134], [133, 133, 133], [132, 132, 132], [131, 131, 131], [130, 130, 130], [129, 129, 129], [128, 128, 128], [127, 127, 127], [126, 126, 126], [125, 125, 125], [124, 124, 124], [123, 123, 123], [122, 122, 122], [121, 121, 121], [120, 120, 120], [119, 119, 119], [118, 118, 118], [117, 117, 117], [116, 116, 116], [115, 115, 115], [114, 114, 114], [113, 113, 113], [112, 112, 112], [111, 111, 111], [110, 110, 110], [109, 109, 109], [108, 108, 108], [107, 107, 107], [106, 106, 106], [105, 105, 105], [104, 104, 104], [103, 103, 103], [102, 102, 102], [101, 101, 101], [100, 100, 100], [99, 99, 99], [98, 98, 98], [97, 97, 97], [96, 96, 96], [95, 95, 95], [94, 94, 94], [93, 93, 93], [92, 92, 92], [91, 91, 91], [90, 90, 90], [89, 89, 89], [88, 88, 88], [87, 87, 87], [86, 86, 86], [85, 85, 85], [84, 84, 84], [83, 83, 83], [82, 82, 82], [81, 81, 81], [80, 80, 80], [79, 79, 79], [78, 78, 78], [77, 77, 77], [76, 76, 76], [75, 75, 75], [74, 74, 74], [73, 73, 73], [72, 72, 72], [71, 71, 71], [70, 70, 70], [69, 69, 69], [68, 68, 68], [67, 67, 67], [66, 66, 66], [65, 65, 65], [64, 64, 64], [63, 63, 63], [62, 62, 62], [60, 60, 60], [59, 59, 59], [58, 58, 58], [57, 57, 57], [56, 56, 56], [55, 55, 55], [54, 54, 54], [53, 53, 53], [52, 52, 52], [51, 51, 51], [50, 50, 50], [49, 49, 49], [48, 48, 48], [47, 47, 47], [46, 46, 46], [45, 45, 45], [44, 44, 44], [43, 43, 43], [42, 42, 42], [42, 42, 42], [41, 41, 41], [40, 40, 40], [39, 39, 39], [38, 38, 38], [37, 37, 37], [36, 36, 36], [35, 35, 35], [34, 34, 34], [33, 33, 33], [32, 32, 32], [31, 31, 31], [30, 30, 30], [29, 29, 29], [28, 28, 28], [27, 27, 27], [26, 26, 26], [25, 25, 25], [24, 24, 24], [23, 23, 23], [22, 22, 22], [21, 21, 21], [20, 20, 20], [19, 19, 19], [18, 18, 18], [17, 17, 17], [16, 16, 16], [15, 15, 15], [14, 14, 14], [13, 13, 13], [12, 12, 12], [11, 11, 11], [10, 10, 10], [9, 9, 9], [8, 8, 8], [7, 7, 7], [6, 6, 6], [5, 5, 5], [4, 4, 4], [3, 3, 3], [2, 2, 2], [1, 1, 1], [0, 0, 0]]

import tempfile
os.environ['LIBROSA_CACHE_DIR'] = tempfile.gettempdir() + '/librosa_cache'
os.environ['LIBROSA_CACHE_LEVEL'] = '50'
import librosa


def _resample(oldMatrix, newWidth):
    print("resampling...")
    columnsNumber = newWidth
    newMatrix = np.zeros((columnsNumber, len(oldMatrix[0])))

    oldPiece = 1 / len(oldMatrix)
    newPiece = 1 / columnsNumber

    for i in range(columnsNumber):
        column = np.zeros((len(oldMatrix[0]),))

        for j in range(len(oldMatrix)):
            oldStart = j * oldPiece
            oldEnd = oldStart + oldPiece
            newStart = i * newPiece
            newEnd = newStart + newPiece

            overlap = 0
            if oldEnd <= newStart or newEnd <= oldStart:
                overlap = 0
            else:
                overlap = min(max(oldEnd, newStart), max(
                    newEnd, oldStart)) - max(min(oldEnd, newStart), min(newEnd, oldStart))

            if overlap > 0:
                for k in range(len(oldMatrix[0])):
                    column[k] += ((overlap / newPiece) * oldMatrix[j][k])

        intColumn = np.zeros((len(oldMatrix[0]),), int)
        for m in range(len(oldMatrix[0])):
            intColumn[m] = np.uint8(column[m])

        newMatrix[i] = intColumn

    return newMatrix


def draw(dB, width, height, file):
    print("exporting to (" + str(width) + " " + str(height) + ")")
    pixels = dB
    heightFactor = 2.2

    surface = cairo.ImageSurface(cairo.FORMAT_RGB24, width, height)
    ctx = cairo.Context(surface)
    start = time.time()

    for i in range(len(pixels)):
        for j in range(len(pixels[i])):
            colorval = bone_cmap[int(pixels[i][j])]
            # print(colorval)
            r = colorval[0] / 255
            g = colorval[1] / 255
            b = colorval[2] / 255
            ctx.set_source_rgb(r, g, b)
            ctx.rectangle(
                i, height - (j*heightFactor), 1, heightFactor)
            ctx.fill()

    print ("pixel draw took " + str(time.time() - start))

    #start = time.time()
    # surface.write_to_png(file)  # Output to PNG
    #print ("write png took " + str(time.time() - start))

    start = time.time()
    data = surface.get_data()
    f = open(file, "w")
    f.write(data)
    f.close()
    print ("write raw took " + str(time.time() - start))


def export_to_png(dB, width, height, file):
    newdB = np.swapaxes(dB, 0, 1)
    # newdB = _resample(newdB, width)
    # zoomdB = scipy.ndimage.zoom(newdB, width/len(newdB))
    start = time.time()
    zoomdB = resample(newdB, width)
    zoomdB2 = np.uint8(zoomdB)
    print ("resampling took " + str(time.time() - start))
    draw(zoomdB2, width, height, file)


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
    start = time.time()
    b_p_o = 12 * 3
    n_bins = 7 * b_p_o
    C = librosa.hybrid_cqt(
        y=y,
        sr=sr,
        bins_per_octave=b_p_o,
        n_bins=n_bins,
    )

    dB = librosa.amplitude_to_db(np.abs(C), ref=np.max)
    print("cqt analysis took " + str(time.time() - start))
    oldWidth = C.shape[1]
    newWidth = int(sys.argv[3]) if len(sys.argv) >= 5 else C.shape[1]

    mode = 'dump'
    # if mode == 'dump':
    path = os.path.join(sys.argv[2], "cqt.raw")
    # np.save(path, dB)
    newHeight = int(sys.argv[4]) if len(sys.argv) >= 5 else C.shape[0]

    export_to_png(dB, newWidth, newHeight, path)
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


def key_detect_madmom(path):
    args = argparse.Namespace()
    key = key_prediction_to_label(
        CNNKeyRecognitionProcessor(**vars(args))(path))
    path = os.path.join(sys.argv[2], "key")
    with open(path, 'w') as file:
        file.write(key)
    print("finished madmom:key detect")


def chords_detect_madmom(path):
    args = argparse.Namespace()
    in_processor = DeepChromaProcessor(**vars(args))(path)
    chord_processor = DeepChromaChordRecognitionProcessor(**vars(args))
    chords = chord_processor(in_processor)
    path = os.path.join(sys.argv[2], "chords")
    with open(path, 'w') as file:
        for chord in chords.tolist():
            file.write("%s,%s,%s\n" % (chord[0], chord[1], chord[2]))
    print("finished madmom:chords detect")


def thread_librosa(y, sr):
    print("starting librosa thread")
    onset_env = librosa.onset.onset_strength(y, sr=sr)
    t1 = threading.Thread(target=cqt_librosa, args=(y, sr,))
    t3 = threading.Thread(target=beats_librosa, args=(y, sr, onset_env))

    t1.start()
    t3.start()
    t1.join()

    t3.join()


if __name__ == '__main__':
    if len(sys.argv) <= 2:
        print("args: file dir width")
        sys.exit(0)
    start = time.time()
    print("librosa load/decode")
    y, sr = librosa.load(sys.argv[1], sr=None)
    path = os.path.join(sys.argv[2], "media.wav")

    y_hat = librosa.core.resample(y, sr, 44100, res_type='kaiser_fast')
    librosa.output.write_wav(path, y_hat, 44100)

    print("librosa decode took " + str(time.time() - start))

    t1 = threading.Thread(target=thread_librosa, args=(y, sr))
    t3 = threading.Thread(target=key_detect_madmom, args=(path,))
    t4 = threading.Thread(target=chords_detect_madmom, args=(path, ))

    t1.start()
    t3.start()
    t4.start()

    t1.join()
    t3.join()
    t4.join()
    end = time.time()
    os.unlink(path)
    print("\nTotal time: " + str(end - start) + " s")
