import librosa


def process(path, args=[]):
    y, sr = librosa.load(path)
    onset_env = librosa.onset.onset_strength(y, sr=sr)
    tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)

    return tempo[0]
