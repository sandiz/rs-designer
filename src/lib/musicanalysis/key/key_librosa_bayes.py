import sys
sys.path.append('./key/keyedin')
sys.path.append('./keyedin')
import keyedin

def process(file, args=[]):
    # Use naive Bayes classifier to guess the key of SongInGMajor.mp3
    naive_bayes = keyedin.classifiers.NaiveBayes()
    dist = keyedin.pd.PitchDistribution.from_file(file)
    op = (naive_bayes.get_key(dist))  # Returns Key object Key('G', 'major')
    output = op.split(" ")
    output.append(-1)
    return output
