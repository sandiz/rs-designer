from essentia.standard import KeyExtractor, MonoLoader


def process(path, args=[]):
    profileType = "bgate"
    if(len(args) > 1 and args[0] == "--profileType"):
        profileType = args[1]

    y = MonoLoader(filename=path)()
    #print("using profileType: " + profileType)
    a = KeyExtractor(profileType=profileType)(y)
    return a
