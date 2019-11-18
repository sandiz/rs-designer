#!/usr/bin/env python
"""
Classifiers for guessing key of pitch distribution.
"""

import pitchdistribution as pd
import numpy as np


class Classifier(object):
    """
    Abstract class for classifiers PitchDistribution --> key (distributional key finders)
    """

    def __init__(self):
        if type(self) is Classifier:
            raise Exception(
                "Classifier is an abstract class and can't be directly instantiated")

    @staticmethod
    def get_key_profiles():
        """
        Return dictionary of typical pitch class distribution for all keys
        """
        profiles = {}
        for tonic in pd.NOTES:
            for scale in pd.SCALES:
                key = pd.Key(tonic, scale)
                profiles[str(key)] = key.get_key_profile()
        return profiles

    def get_key(self, dist):
        """
        Given PitchDistribution DIST, return classifier's guess for its key
        """
        raise NotImplementedError(
            "Subclasses of Classifier must implement get_key method")


class KrumhanslSchmuckler(Classifier):
    """
    Classifier using the Krumhansl-Schmuckler key-finding algorithm
    """

    def __init__(self):
        self.key_profiles = self.get_key_profiles()

    def correlation(self, key, dist):
        """
        Given key KEY and pitch distribution DIST, return correlation coefficient of DIST and KEY's pitch profile
        """
        key_profile = self.key_profiles[key].to_array()
        data = np.array([dist, key_profile])
        return np.corrcoef(data)[1, 0]

    def get_key(self, dist):
        """
        Given PitchDistribution DIST, return the key whose typical pitch profile best matches it
        """
        assert len(dist.distribution) == pd.NUM_NOTES, "Distribution must have %d notes, %d provided" % (
            pd.NUM_NOTES, len(dist.distribution))
        dist = dist.to_array()
        correlations = {k: self.correlation(
            k, dist) for k in self.key_profiles}
        return max(correlations, key=correlations.get)


class NaiveBayes(Classifier):
    """
    Classifier using a Naive Bayes model with values of a pitch distribution as features
    """

    def __init__(self):
        self.key_profiles = self.get_key_profiles()

    def get_proportion_probability(self, key, note, prop):
        """
        Return probability of a PitchDistribution with true key KEY having value PROP for note NOTE
        """
        expected_proportion = self.key_profiles[key].get_val(note)
        return 1 - (prop - expected_proportion)**2

    def get_key_likelihood(self, key, dist):
        """
        Return probability proportional to that of PitchDistribution DIST given key KEY
        """
        likelihood = 1.0
        for note in pd.NOTES:
            likelihood *= self.get_proportion_probability(
                key, note, dist.get_val(note))
        return likelihood

    def get_key(self, dist):
        """
        Given PitchDistribution DIST, return the key which is most likely given Naive Bayes model
        """
        assert len(dist.distribution) == pd.NUM_NOTES, "Distribution must have %d notes, %d provided" % (
            pd.NUM_NOTES, len(dist.distribution))
        likelihoods = {k: self.get_key_likelihood(
            k, dist) for k in self.key_profiles}
        return max(likelihoods, key=likelihoods.get)
