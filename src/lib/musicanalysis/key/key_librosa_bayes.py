import sys
sys.path.append('./keyedin')
from keyedin import pitchdistribution as pd, classifiers

# Use naive Bayes classifier to guess the key of SongInGMajor.mp3
naive_bayes = classifiers.NaiveBayes()
dist = pd.PitchDistribution.from_file(sys.argv[1])
op = (naive_bayes.get_key(dist))  # Returns Key object Key('G', 'major')
output = op.split(" ")
output.append(1)
print(output)
# key=[op.]
