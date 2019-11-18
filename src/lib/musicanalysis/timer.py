#!/usr/local/bin/python3
import sys
import os.path
from os import path
import json
import time
import subprocess


def prRed(skk): return("\033[91m {}\033[00m" .format(skk))


def prGreen(skk): return("\033[92m {}\033[00m" .format(skk))


def prYellow(skk): return("\033[93m {}\033[00m" .format(skk))


def prLightPurple(skk): return("\033[94m {}\033[00m" .format(skk))


def prPurple(skk): return("\033[95m {}\033[00m" .format(skk))


def prCyan(skk): return("\033[96m {}\033[00m" .format(skk))


def prLightGray(skk): return("\033[97m {}\033[00m" .format(skk))


def prBlack(skk): return("\033[98m {}\033[00m" .format(skk))


def runProviders(key):
    cwd = os.getcwd()
    os.chdir(key)
    print("Running providers for " + key)
    provider = f"./providers.json"
    if path.exists(provider):
        with open(provider) as json_file:
            data = json.load(json_file)
            idx = 1
            p = data["providers"]
            for key1 in p:
                c_file = f"{key1}"
                py_file = f"{key1}.py"
                c_time = py_time = 0
                c_found = py_found = False
                c_output = py_output = 0
                py_start = time.time()

                spargs = []
                args = []
                if "args" in data:
                    if key1 in data["args"]:
                        args = data["args"][key1]
                if len(args) > 0:
                    for arg in args:
                        argName = arg["argName"]
                        value = arg["values"][0]
                        spargs.append(argName)
                        spargs.append(value)

                if path.exists(py_file):
                    py_found = True
                    py_output = subprocess.check_output(
                        ["python3", py_file, file] + spargs, stderr=subprocess.DEVNULL)
                    if key == "beats" or key == "chords":
                        py_output = "# detected: " + str(
                            len(json.loads(py_output.decode()))) + "\n"
                        py_output = py_output.encode()

                c_start = time.time()
                if path.exists(c_file):
                    c_found = True
                    c_output = subprocess.check_output(
                        [c_file, file] + spargs, stderr=subprocess.DEVNULL)
                    if key == "beats" or key == "chords":
                        c_output = "# detected: " + str(
                            len(json.loads(c_output.decode()))) + "\n"
                        c_output = c_output.encode()

                c_time = f"{round(time.time() - c_start)} seconds"
                c_print = f" {prGreen(c_time)} | {prGreen(str(c_output.decode()))}" if c_found else prYellow(
                    "[N/A]")
                py_time = f"{round(time.time() - py_start)} seconds"
                py_print = f" {prGreen(py_time)} | {prGreen(str(py_output.decode()))}" if py_found else prYellow(
                    "[N/A]")
                print(
                    f"{idx}. {prCyan(key1)}: args: {prLightPurple(spargs)}\nPython: {py_print}C: {c_print}")
                idx += 1
    else:
        print("No providers.json")

    os.chdir(cwd)

    print("=======================================================")


file = sys.argv[1]
onlyOne = False
if(len(sys.argv) > 2):
    onlyOne = True

print("Input File: " + file)

folders = ["key", "tempo", "chords", "beats"]

if(onlyOne):
    runProviders(sys.argv[2])
else:
    for k in folders:
        runProviders(k)
