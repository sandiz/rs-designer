import argparse
import time
import sys
import json
import os
from key import key_essentia, key_madmom, key_librosa_bayes, key_librosa_kands
from chords import chords_madmom
from beats import beats_essentia, beats_librosa, beats_madmom
from tempo import tempo_essentia_percival, tempo_essentia_re2013, tempo_librosa, tempo_madmom


def prRed(skk): return("\033[91m {}\033[00m" .format(skk))


def prGreen(skk): return("\033[92m{}\033[00m" .format(skk))


def prYellow(skk): return("\033[93m{}\033[00m" .format(skk))


def prLightPurple(skk): return("\033[94m{}\033[00m" .format(skk))


def prPurple(skk): return("\033[95m{}\033[00m" .format(skk))


def prCyan(skk): return("\033[96m{}\033[00m" .format(skk))


def prLightGray(skk): return("\033[97m{}\033[00m" .format(skk))


def prBlack(skk): return("\033[98m{}\033[00m" .format(skk))


key_switcher = {
    "key_essentia": key_essentia.process,  # binary compatible
    "key_madmom": key_madmom.process,     # binary compatible
    "key_librosa_bayes": key_librosa_bayes.process,  # binary compatible
    "key_librosa_kands": key_librosa_kands.process  # binary compatible
}
chord_switcher = {
    "chords_madmom":  chords_madmom.process,  # binary compatible
}
beats_switcher = {
    "beats_essentia": beats_essentia.process,  # binary compatible
    "beats_librosa": beats_librosa.process,   # binary compatible
    "beats_madmom": beats_madmom.process,     # binary compatible
}
tempo_switcher = {
    "tempo_essentia_percival": tempo_essentia_percival.process,  # binary compatible
    "tempo_essentia_re2013": tempo_essentia_re2013.process,     # binary compatible
    "tempo_librosa": tempo_librosa.process,                     # binary compatible
    "tempo_madmom": tempo_madmom.process,                       # binary compatible
}

benchTestFailed = False
testData = {}


def benchRun(key, switcher, args):
    start = time.time()
    func = switcher.get(key, None)
    if func:
        output = func(args.file, args.args)
        diff = round(time.time() - start)
        return (output, diff)
    return None


def checkResult(args, key, output):
    output = json.loads(output)
    keys = dict.keys(testData)
    if key in keys:
        testInfo = testData[key]
        typeOf = testInfo["type"]
        isContains = "contains" in testInfo
        isMinMax = "min" in testInfo and "max" in testInfo
        isLength = "length" in testInfo

        if typeOf == "list" and type(output) == list:
            if isContains:
                contains = testInfo["contains"]
                return set(contains).issubset(set(output))
            if isLength:
                tlength = int(testInfo["length"])
                return tlength == len(output)
        elif typeOf == "float" and type(output) == float:
            if isMinMax:
                tmin = float(testInfo["min"])
                tmax = float(testInfo["max"])
                return tmin <= output <= tmax
    return False


def do(key, switcher, args, defaultValue):
    global benchTestFailed
    if args.type == "bench":
        print(f"Benchmarking {key} providers")
        keys = dict.keys(switcher)
        idx = 0
        for key1 in keys:
            idx += 1
            (output, diff) = benchRun(key1, switcher, args)
            print_output = output
            if key == "chords" or key == "beats":
                print_output = len(print_output)

            if(args.results is None):
                print(
                    f"#{idx} algo: {prGreen(key1)} | time: {prYellow(diff)} seconds | output: {prLightPurple(json.dumps(print_output))}")
            else:
                result = checkResult(args, key1, json.dumps(output))
                if result is False:
                    print("test failed here")
                    benchTestFailed = True
                msg = prGreen("passed") if result else prRed("failed")
                print(
                    f"#{idx} algo: {prGreen(key1)} | time: {prYellow(diff)} seconds | output: {prLightPurple(json.dumps(print_output))} | test: {msg}")
    else:
        output = defaultValue
        func = switcher.get(args.algo, None)
        if(func is None):
            output = defaultValue
        else:
            output = func(args.file, args.args)
        if(len(args.args)) > 0:
            print("args: " + json.dumps(args.args), file=sys.stderr)
        print(json.dumps(output))


def processArgs(args):
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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='music-analysis cli')
    parser.add_argument('-f', '--file', default=None,
                        help='file to run analysis on')
    parser.add_argument(
        '-t', '--type', help='type of analysis, one of (key|chords|beats|tempo|bench)')
    parser.add_argument(
        '-a', '--algo', help='algorithm to use (see providers.json)')
    parser.add_argument('-r', '--results', default=None,
                        help='if running in bench mode, compare results with this file')
    parser.add_argument('--args', nargs=argparse.REMAINDER, default=[],
                        help="anything after this option is sent to the algorithm as runtime args")
    args = parser.parse_args()

    if args.results is not None:
        with open(args.results) as json_file:
            results = json.load(json_file)
            for result in results:
                try:
                    base = os.path.dirname(args.results)
                    media = os.path.join(base, result["media"])

                    if os.path.exists(media):
                        print(prGreen("testing with file: " + media))
                        args.file = media
                        testData = result['tests']
                        processArgs(args)
                    else:
                        benchTestFailed = True
                        print(prRed("failed to find file: " + media))
                except:
                    benchTestFailed = True
                    print("test failed for " + result)
    else:
        processArgs(args)

    msg = prRed("False") if benchTestFailed else prGreen("True")

    if args.type == "bench":
        print(f"All tests Passed: { msg }")

    if benchTestFailed:
        sys.exit(1)
    else:
        sys.exit(0)
