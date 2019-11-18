import argparse
import time
import sys
import json
from key import key_essentia, key_madmom, key_librosa_bayes, key_librosa_kands
from chords import chords_madmom
from beats import beats_essentia, beats_librosa, beats_madmom
from tempo import tempo_essentia_percival, tempo_essentia_re2013, tempo_librosa, tempo_madmom
providers = ["key"]  # "tempo", "chords", "beats"]
key_switcher = {
    "key_essentia": key_essentia.process,
    "key_madmom": key_madmom.process,
    "key_librosa_bayes": key_librosa_bayes.process,
    "key_librosa_kands": key_librosa_kands.process
}
chord_switcher = {
    "chords_madmom":  chords_madmom.process,
}
beats_switcher = {
    "beats_essentia": beats_essentia.process,
    "beats_librosa": beats_librosa.process,
    "beats_madmom": beats_madmom.process,
}
tempo_switcher = {
    "tempo_essentia_percival": tempo_essentia_percival.process,
    "tempo_essentia_re2013": tempo_essentia_re2013.process,
    "tempo_librosa": tempo_librosa.process,
    "tempo_madmom": tempo_madmom.process,
}


def benchRun(key, switcher, args):
    start = time.time()
    func = switcher.get(key, None)
    if func:
        output = func(args.file, args.args)
        diff = round(time.time() - start)
        return (output, diff)
    return None


def do(key, switcher, args, defaultValue):
    if args.type == "bench":
        print(f"Benchmarking {key} providers")
        keys = dict.keys(switcher)
        idx = 0
        for key1 in keys:
            idx += 1
            (output, diff) = benchRun(key1, switcher, args)
            if key == "chords" or key == "beats":
                output = len(output)
            print(
                f"#{idx} algo: {key1} time: {diff} seconds output: {json.dumps(output)}")
    else:
        output = defaultValue
        func = switcher.get(args.algo, None)
        if(func is None):
            output = defaultValue
        else:
            output = func(args.file, args.args)
        print(json.dumps(output))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-f', '--file', default=None)
    parser.add_argument('-t', '--type')
    parser.add_argument('-a', '--algo')
    parser.add_argument('--args', nargs=argparse.REMAINDER, default=[])
    args = parser.parse_args()

    if args.file is None:
        print("no file specified")
        sys.exit(0)

    if args.type == "key":
        do("key", key_switcher, args, [])
    elif args.type == "chords":
        do("chords", chord_switcher, args, [])
    elif args.type == "beats":
        do("beats", beats_switcher, args, [])
    elif args.type == "tempo":
        do("tempo", tempo_switcher, args, 0)
    elif args.type == "bench":
        do("key", key_switcher, args, [])
        do("tempo", tempo_switcher, args, 0)
        do("chords", chord_switcher, args, [])
        do("beats", beats_switcher, args, [])
