#!/usr/bin/python3

from __future__ import print_function
import numpy as np
import scipy
import matplotlib.pyplot as plt

import librosa
import librosa.display
import sys
import time
import tempfile
import threading
import json

files = {}
def chroma(y, sr):
    start = time.process_time()
    y_harm = librosa.effects.harmonic(y=y, margin=8)
    #print("hpss",time.process_time() - start)
    start = time.process_time()
    chroma_orig = librosa.feature.chroma_cqt(y=y_harm, sr=sr, bins_per_octave=12*3*7, n_chroma=12 * 3 * 7)
    #print("chroma",time.process_time() - start)
    start = time.process_time()
    #chroma_filter = np.minimum(chroma_orig,
    #                           librosa.decompose.nn_filter(chroma_orig,
    #                                                       aggregate=np.median,
    #                                                       metric='cosine'))
    chroma_filter = chroma_orig
    #print("filter",time.process_time() - start)

    start = time.process_time()
    chroma_smooth = scipy.ndimage.median_filter(chroma_filter, size=(1, 9))
    #print("smooth",time.process_time() - start)
    #np.save(fp, chroma_smooth, False)
    files["chroma"] = chroma_smooth


def cqt(y, sr):
    # And for comparison, we'll show the CQT matrix as well.
    start = time.process_time()
    C = np.abs(librosa.cqt(y=y, sr=sr, bins_per_octave=12*3, n_bins=7*12*3))
    #print("raw", time.process_time() - start)
    #np.save(fp, librosa.amplitude_to_db(C), False)
    #print(fp.name)
    files["cqt"] = librosa.amplitude_to_db(C)


def process(file, args=[]):
    y, sr = librosa.load(file)
    t1 = threading.Thread(target=chroma, args=(y,sr,))
    t2 = threading.Thread(target=cqt, args=(y,sr,))

    t1.start()
    t2.start()
    t1.join()
    t2.join()
    fp = tempfile.NamedTemporaryFile(delete=False)
    np.savez_compressed(fp, a=files["chroma"], b=files["cqt"])
    print(json.dumps({"file": fp.name}))



if __name__ == '__main__':
    process(sys.argv[1])
    #start = time.process_time()
    #print("load", time.process_time() - start)
   

#plt.figure(figsize=(12, 5))
#plt.subplot(2, 1, 1)
#librosa.display.specshow(librosa.amplitude_to_db(C, ref=np.max),
#                         y_axis='cqt_note', bins_per_octave=12*3)
#plt.colorbar()
#plt.subplot(2, 1, 2)
#librosa.display.specshow(chroma_smooth, y_axis='chroma', x_axis='time',  bins_per_octave=12*3)
#librosa.display.specshow(librosa.amplitude_to_db(chroma_smooth, ref=np.max),
#                        y_axis='cqt_note', bins_per_octave=12*3)
#plt.ylabel('Processed')
#plt.colorbar()
#plt.tight_layout()
#plt.show()
# margin for hpss
# chroma filter

