#!/usr/bin/env python3
"""
Check an exported plot dir against the PLAN.md §5 contracts.

    python3 tools/validate_plot.py public/data/plots/fariy_1_test [more plot dirs…]

Exits non-zero on any error. Warnings don't fail the check.
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import numpy as np

SIZES = {"float32": 4, "uint8": 1, "uint16": 2}
REQUIRED_ATTRS = {"position": ("float32", 3), "color": ("uint8", 3), "semantic": ("uint8", 1),
                  "instance": ("uint16", 1), "hag": ("uint16", 1), "tSeen": ("uint16", 1)}
SUMMARY_KEYS = ["plotAreaM2", "nInstances", "nValidTrees", "nRejected", "stemsPerHa", "dbhCmMean", "dbhCmMedian",
                "dbhCmMin", "dbhCmMax", "quadraticMeanDbhCm", "heightMMean", "heightMMax", "basalAreaM2",
                "basalAreaM2PerHa", "woodVolumeM3", "woodVolumeM3PerHa", "biomassT", "biomassTPerHa", "carbonT",
                "co2eT", "nSpacingConflictTrees", "nThinningRemove"]
TREE_KEYS = {"id": int, "valid": bool, "species": str, "base": list, "top": list, "wellSpaced": bool,
             "thinRemove": bool, "qsmStatus": str, "nPoints": int}
TREE_NUMERIC = ["dbhCm", "dbhCmQsm", "heightM", "heightMQsm", "basalAreaM2", "volumeM3", "biomassKg", "carbonKg",
                "co2eKg", "crownRadiusM", "stemTiltDeg", "nnDistM", "nnId"]
QSM_STATUS = {"ok", "partial", "no_tree", "not_run"}
CAMERAS = {"front", "left", "right", "back"}


class Report:
    def __init__(self, name: str):
        self.name, self.errors, self.warnings = name, [], []

    def err(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def check(self, cond, msg):
        if not cond:
            self.err(msg)
        return cond


def validate(plot_dir: Path) -> Report:
    r = Report(plot_dir.name)
    mf = plot_dir / "plot.json"
    if not r.check(mf.exists(), "plot.json missing"):
        return r
    m = json.loads(mf.read_text())

    # ── manifest ──
    for k in ("id", "name", "captureDate", "device", "operator", "species", "geo", "offset", "files", "summary"):
        r.check(k in m, f"plot.json: missing '{k}'")
    r.check(m.get("id") == plot_dir.name, f"plot.json: id '{m.get('id')}' != dir name '{plot_dir.name}'")
    geo = m.get("geo", {})
    r.check(-90 <= geo.get("lat", 999) <= 90 and -180 <= geo.get("lon", 999) <= 180, "plot.json: bad geo lat/lon")
    if "boundary" in geo:
        b = geo["boundary"]
        r.check(len(b) >= 4 and b[0] == b[-1], "plot.json: geo.boundary must be a closed ring")
    for k in SUMMARY_KEYS:
        r.check(isinstance(m.get("summary", {}).get(k), (int, float)), f"plot.json: summary.{k} missing/non-numeric")
    files = m.get("files", {})
    for k in ("cloud", "trees"):
        r.check(k in files, f"plot.json: files.{k} missing")

    def exists(rel, what):
        return r.check((plot_dir / rel).exists(), f"{what}: file not found ({rel})")

    for k in ("cloud", "trees", "trajectory", "dtm"):
        if k in files:
            exists(files[k], f"files.{k}")
    for cam, rel in (files.get("video") or {}).items():
        r.check(cam in CAMERAS, f"files.video: unknown camera '{cam}'")
        exists(rel, f"files.video.{cam}")
    for cam, rends in (files.get("videoRenditions") or {}).items():
        r.check(cam in CAMERAS, f"files.videoRenditions: unknown camera '{cam}'")
        for i, v in enumerate(rends):
            r.check(v.get("codec") in ("hevc", "h264"), f"files.videoRenditions.{cam}[{i}]: codec must be hevc|h264")
            r.check(all(isinstance(v.get(k), int) for k in ("width", "height")), f"files.videoRenditions.{cam}[{i}]: width/height")
            exists(v.get("src", ""), f"files.videoRenditions.{cam}[{i}]")
    if "camera" in files and exists(files["camera"], "files.camera"):
        cam = json.loads((plot_dir / files["camera"]).read_text())
        r.check(cam.get("version") == 1 and cam.get("model") == "pinhole", "camera.json: version 1, model pinhole")
        for k in ("width", "height", "fx", "fy", "cx", "cy", "hfovDeg", "vfovDeg"):
            r.check(isinstance(cam.get(k), (int, float)) and cam[k] > 0, f"camera.json: {k} must be a positive number")
    for key, rel in (files.get("charts") or {}).items():
        exists(rel, f"files.charts.{key}")

    # ── cloud ──
    count = 0
    if "cloud" in files and (plot_dir / files["cloud"]).exists():
        hdr = json.loads((plot_dir / files["cloud"]).read_text())
        binp = (plot_dir / files["cloud"]).with_suffix(".bin")
        if r.check(binp.exists(), "cloud.bin missing next to cloud.json"):
            count = hdr.get("count", 0)
            r.check(hdr.get("version") == 1, "cloud.json: version must be 1")
            r.check(count > 0, "cloud.json: count must be > 0")
            attrs = {a["name"]: a for a in hdr.get("attributes", [])}
            bin_size = binp.stat().st_size
            for name, (typ, size) in REQUIRED_ATTRS.items():
                a = attrs.get(name)
                if not r.check(a is not None, f"cloud.json: attribute '{name}' missing"):
                    continue
                r.check(a["type"] == typ and a["size"] == size, f"cloud.json: {name} must be {typ}×{size}")
                r.check(a["byteOffset"] % 4 == 0, f"cloud.json: {name} byteOffset not 4-byte aligned")
                r.check(a["byteLength"] == count * size * SIZES[typ], f"cloud.json: {name} byteLength mismatch")
                r.check(a["byteOffset"] + a["byteLength"] <= bin_size, f"cloud.bin: {name} runs past end of file")
            if not r.errors:
                raw = np.memmap(binp, dtype=np.uint8, mode="r")
                pa = attrs["position"]
                pos = np.frombuffer(raw[pa["byteOffset"]:pa["byteOffset"] + pa["byteLength"]], "<f4").reshape(-1, 3)
                lo, hi = np.array(hdr["bbox"]["min"]), np.array(hdr["bbox"]["max"])
                r.check(np.isfinite(pos).all(), "cloud.bin: non-finite positions")
                r.check((pos.min(0) >= lo - 1e-2).all() and (pos.max(0) <= hi + 1e-2).all(),
                        "cloud.json: bbox does not contain all points")
                centre = (lo[:2] + hi[:2]) / 2
                if np.abs(centre).max() > 5:
                    r.warn(f"cloud: XY bbox centre {centre.round(2).tolist()} is far from origin (§5.1)")
                sa = attrs["semantic"]
                sem = np.frombuffer(raw[sa["byteOffset"]:sa["byteOffset"] + sa["byteLength"]], np.uint8)
                r.check(sem.max() <= 2, "cloud.bin: semantic class > 2")

    # ── trees ──
    if "trees" in files and (plot_dir / files["trees"]).exists():
        trees = json.loads((plot_dir / files["trees"]).read_text())
        r.check(isinstance(trees, list) and trees, "trees.json: must be a non-empty array")
        ids = set()
        for t in trees:
            tid = t.get("id")
            r.check(tid not in ids, f"trees.json: duplicate id {tid}")
            ids.add(tid)
            for k, typ in TREE_KEYS.items():
                r.check(isinstance(t.get(k), typ), f"trees.json[{tid}]: '{k}' missing or not {typ.__name__}")
            for k in TREE_NUMERIC:
                r.check(k in t and (t[k] is None or isinstance(t[k], (int, float))),
                        f"trees.json[{tid}]: '{k}' must be number|null")
            r.check(len(t.get("base", [])) == 3 and len(t.get("top", [])) == 3, f"trees.json[{tid}]: base/top xyz")
            r.check(t.get("qsmStatus") in QSM_STATUS, f"trees.json[{tid}]: bad qsmStatus")
            if t.get("valid"):
                # The pipeline can accept a tree (height measured) whose DBH fit failed → dbhCm null.
                r.check(t.get("heightM") is not None, f"trees.json[{tid}]: valid tree without heightM")
            elif not t.get("rejectReason"):
                r.warn(f"trees.json[{tid}]: rejected tree without rejectReason")
            rings = t.get("dbhRings")
            if rings is not None:
                ok = isinstance(rings, list) and all(
                    len(rg.get("center", [])) == 3 and len(rg.get("normal", [])) == 3 and rg.get("radiusM", 0) > 0
                    for rg in rings)
                r.check(ok, f"trees.json[{tid}]: malformed dbhRings")
                r.check(isinstance(t.get("dbhRingIndex"), int) and 0 <= t["dbhRingIndex"] < len(rings),
                        f"trees.json[{tid}]: dbhRingIndex out of range")
            for k in ("thumbnail", "qsmMesh"):
                if t.get(k):
                    exists(t[k], f"trees.json[{tid}].{k}")
        nvalid = sum(t.get("valid", False) for t in trees)
        nodbh = sum(1 for t in trees if t.get("valid") and t.get("dbhCm") is None)
        if nodbh:
            r.warn(f"info: {nodbh} valid trees without a DBH (fit failed)")
        if nvalid != m.get("summary", {}).get("nValidTrees"):
            r.warn(f"trees.json: {nvalid} valid trees vs summary.nValidTrees={m['summary'].get('nValidTrees')}")

    # ── trajectory ──
    if "trajectory" in files and (plot_dir / files["trajectory"]).exists():
        tr = json.loads((plot_dir / files["trajectory"]).read_text())
        for k in ("rateHz", "durationS", "sensorHeightM", "videoOffsetS", "samples"):
            r.check(k in tr, f"trajectory.json: missing '{k}'")
        r.check(tr.get("yawSource", "velocity") in ("orientation", "velocity"), "trajectory.json: yawSource must be orientation|velocity")
        s = np.array(tr.get("samples", []), float)
        if r.check(s.ndim == 2 and s.shape[1] == 5, "trajectory.json: samples must be [t,x,y,z,yaw]"):
            r.check(abs(s[0, 0]) < 1e-6, "trajectory.json: first t must be 0")
            r.check((np.diff(s[:, 0]) > 0).all(), "trajectory.json: t must be strictly increasing")
            r.check(abs(s[-1, 0] - tr.get("durationS", -1)) < 0.05, "trajectory.json: durationS != last t")

    # ── glb files ──
    for rel in [files.get("dtm")] if files.get("dtm") else []:
        p = plot_dir / rel
        if p.exists():
            magic, ver, length = struct.unpack("<III", p.read_bytes()[:12])
            r.check(magic == 0x46546C67 and ver == 2 and length == p.stat().st_size, f"{rel}: invalid GLB header")

    if count:
        r.warn(f"info: {count:,} points")
    return r


def main() -> int:
    dirs = [Path(a) for a in sys.argv[1:]] or sorted(p for p in Path("public/data/plots").iterdir() if p.is_dir())
    failed = 0
    for d in dirs:
        rep = validate(d)
        status = "FAIL" if rep.errors else "ok"
        print(f"{status:4}  {d}")
        for e in rep.errors:
            print(f"      ✗ {e}")
        for w in rep.warnings:
            print(f"      · {w}")
        failed += bool(rep.errors)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
