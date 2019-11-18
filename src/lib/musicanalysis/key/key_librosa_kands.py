import sys
sys.path.append('./keyedin')
from keyedin import pitchdistribution as pd, classifiers

# Use Krumhansl-Schmuckler classifier to guess the key of SongInBMinor.mp3
krumhansl_schmuckler = classifiers.KrumhanslSchmuckler()
dist = pd.PitchDistribution.from_file(sys.argv[1])
# Returns Key object Key('B', 'minor')
op = krumhansl_schmuckler.get_key(dist)
output = op.split(" ")
output.append(1)
print(output)
