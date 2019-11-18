from essentia.standard import PercivalBpmEstimator, MonoLoader
import essentia
essentia.log.infoActive = False
essentia.log.warningActive = False


def process(path, args=[]):
    y = MonoLoader(filename=path)()
    bpm = PercivalBpmEstimator()(y)
    return bpm
