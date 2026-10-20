#!/usr/bin/env python3
"""FILM-S2b calibration probe: run ONE command and report its resource use.

Usage: film-worker-measure.py <cwd> <as-bytes|0> <env-json> <argv...>
Prints one JSON line: wallMs, cpuMs (user+sys of the child), maxRssKb,
exit, signal, stdoutBytes, stderrBytes, cwdBytes. With <as-bytes> > 0 the
child runs under prlimit --as=<as-bytes> (used to find the minimum address
space). Node cannot read a child's rusage, hence this helper. Test-only.
"""
import json
import os
import resource
import shutil
import subprocess
import sys
import time


def tree_bytes(root):
    total = 0
    for base, _dirs, files in os.walk(root):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(base, f))
            except OSError:
                pass
    return total


def main():
    cwd, as_bytes = sys.argv[1], int(sys.argv[2])
    env = json.loads(sys.argv[3])
    argv = sys.argv[4:]
    if as_bytes > 0:
        prlimit = shutil.which("prlimit")
        if not prlimit:
            sys.exit("prlimit unavailable: refusing to measure")
        argv = [prlimit, f"--as={as_bytes}", "--"] + argv
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    t0 = time.monotonic()
    p = subprocess.run(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    wall = (time.monotonic() - t0) * 1000
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    cpu = ((after.ru_utime - before.ru_utime) +
           (after.ru_stime - before.ru_stime)) * 1000
    print(json.dumps({
        "wallMs": round(wall, 1), "cpuMs": round(cpu, 1),
        "maxRssKb": after.ru_maxrss,
        "exit": p.returncode if p.returncode >= 0 else None,
        "signal": -p.returncode if p.returncode < 0 else None,
        "stdoutBytes": len(p.stdout), "stderrBytes": len(p.stderr),
        "cwdBytes": tree_bytes(cwd),
    }))


if __name__ == "__main__":
    main()
