from essentia.standard import RhythmExtractor2013, MonoLoader


def process(path, args=[]):
    y = MonoLoader(filename=path)()
    rhythm_extractor = RhythmExtractor2013(method="multifeature")
    bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(y)
    return bpm
