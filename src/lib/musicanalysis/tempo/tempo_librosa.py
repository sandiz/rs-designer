import librosa
import sys


y, sr = librosa.load(sys.argv[1])
onset_env = librosa.onset.onset_strength(y, sr=sr)
tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)

print(tempo[0])
