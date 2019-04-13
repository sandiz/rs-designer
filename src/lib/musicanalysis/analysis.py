from __future__ import print_function
import numpy as np
import sys
import librosa
#import librosa.display
#import matplotlib.pyplot as plt

b_p_o = 12 * 3
n_bins = 7 * b_p_o
y, sr = librosa.load(sys.argv[1])
C = librosa.cqt(
    y=y,
    sr=sr,
    bins_per_octave=b_p_o,
    n_bins=n_bins,
)
dB = librosa.amplitude_to_db(np.abs(C), ref=np.max)
mode = 'dump'
# if mode == 'dump':
np.save("cqt.npy", dB)
#np.savez_compressed("cqt", dB=dB)
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
