import sys
sys.path.append('./key/keyedin')
sys.path.append('./keyedin')
import keyedin


def process(file, args=[]):
    # Use Krumhansl-Schmuckler classifier to guess the key of SongInBMinor.mp3
    krumhansl_schmuckler = keyedin.classifiers.KrumhanslSchmuckler()
    dist = keyedin.pd.PitchDistribution.from_file(file)
    # Returns Key object Key('B', 'minor')
    op = krumhansl_schmuckler.get_key(dist)
    output = op.split(" ")
    output.append(-1)
    return output
