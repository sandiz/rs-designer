from essentia.standard import KeyExtractor, MonoLoader
import sys
import json

profileType = "bgate"
if(len(sys.argv) > 2 and sys.argv[2] == "--profileType"):
    profileType = sys.argv[3]

y = MonoLoader(filename=sys.argv[1])()
#print("using profileType: " + profileType)
a = KeyExtractor(profileType=profileType)(y)
print(json.dumps(a))
