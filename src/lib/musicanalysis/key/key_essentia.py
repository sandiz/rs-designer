from essentia.standard import KeyExtractor, MonoLoader
import sys
import json
y = MonoLoader(filename=sys.argv[1])()
a = KeyExtractor()(y)
print(json.dumps(a))
