#!/usr/bin/env python3
"""
Phase 0 minimal exporter: writes a small plot in the PLAN.md §5 formats so every workstream
can develop before the full pipeline (tools/prepare_plot.py, WS-A) exists.

Simplifications vs. the real exporter:
  * random subsample (default 300k points)
  * plain class colours instead of synthetic natural RGB
  * HAG and trajectory Z from a coarse 1 m ground grid (no proper DTM)
  * no video, no QSM meshes, no DTM mesh

Usage:
  python3 tools/make_sample.py testdata/fariy_1_test public/data/plots/sample [--points 300000]

Dependencies: numpy, Pillow (scipy optional, used for gap-filling the ground grid).
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
from pathlib import Path

import numpy as np

CLASS_COLORS = {0: (0x89, 0xAF, 0x46), 1: (0x86, 0x5E, 0x3C), 2: (0x63, 0xCF, 0x00)}
CLASS_NAMES = {0: "ground", 1: "wood", 2: "leaves"}
SPECIES = "Chir pine"
SENSOR_HEIGHT_M = 1.8
REVEAL_RANGE_M = 15.0
T_SEEN_NEVER = 65535
GRID_M = 1.0

PLY_TYPES = {
    "double": "<f8", "float": "<f4", "uchar": "u1", "char": "i1",
    "ushort": "<u2", "short": "<i2", "uint": "<u4", "int": "<i4",
}


# ───────────────────────────── IO helpers ─────────────────────────────

def read_ply(path: Path) -> np.ndarray:
    """Read a binary little-endian PLY vertex element into a structured array."""
    with open(path, "rb") as f:
        fields, count = [], 0
        while True:
            line = f.readline().decode("ascii", "replace").strip()
            if line.startswith("format") and "binary_little_endian" not in line:
                raise ValueError(f"{path}: only binary_little_endian PLY is supported")
            if line.startswith("element vertex"):
                count = int(line.split()[-1])
            elif line.startswith("property"):
                _, typ, name = line.split()
                fields.append((name, PLY_TYPES[typ]))
            elif line == "end_header":
                break
        return np.fromfile(f, dtype=np.dtype(fields), count=count)


def write_json(path: Path, obj) -> None:
    path.write_text(json.dumps(obj, indent=1, allow_nan=False))


def num(v: str):
    """CSV cell → float/None."""
    if v is None or v == "" or v.lower() == "nan":
        return None
    return float(v)


def clean(v, digits: int = 4):
    """NaN → None, floats rounded for compact JSON."""
    if isinstance(v, float):
        return None if math.isnan(v) else round(v, digits)
    return v


def truthy(v: str) -> bool:
    return str(v).strip().lower() in ("true", "1", "yes")


# ───────────────────────────── ground grid ─────────────────────────────

class GroundGrid:
    """Coarse ground model: 5th-percentile ground Z per GRID_M cell, gaps filled by nearest cell."""

    def __init__(self, gx: np.ndarray, gy: np.ndarray, gz: np.ndarray):
        self.x0, self.y0 = gx.min(), gy.min()
        nx = int((gx.max() - self.x0) / GRID_M) + 1
        ny = int((gy.max() - self.y0) / GRID_M) + 1
        ix = ((gx - self.x0) / GRID_M).astype(int)
        iy = ((gy - self.y0) / GRID_M).astype(int)
        grid = np.full((nx, ny), np.nan)
        cell = ix * ny + iy
        order = np.argsort(cell, kind="stable")
        cell_s, z_s = cell[order], gz[order]
        bounds = np.flatnonzero(np.diff(cell_s)) + 1
        for c, zs in zip(cell_s[np.r_[0, bounds]], np.split(z_s, bounds)):
            grid.flat[c] = np.percentile(zs, 5)
        if np.isnan(grid).any():
            known = np.argwhere(~np.isnan(grid))
            missing = np.argwhere(np.isnan(grid))
            try:
                from scipy.spatial import cKDTree
                _, idx = cKDTree(known).query(missing)
            except ImportError:  # small grids only
                idx = np.argmin(((missing[:, None, :] - known[None, :, :]) ** 2).sum(-1), axis=1)
            grid[tuple(missing.T)] = grid[tuple(known[idx].T)]
        self.grid, self.nx, self.ny = grid, nx, ny

    def __call__(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        ix = np.clip(((x - self.x0) / GRID_M).astype(int), 0, self.nx - 1)
        iy = np.clip(((y - self.y0) / GRID_M).astype(int), 0, self.ny - 1)
        return self.grid[ix, iy]


# ───────────────────────────── exporters ─────────────────────────────

def export_cloud(out: Path, pos: np.ndarray, sem: np.ndarray, inst: np.ndarray, hag: np.ndarray, t_seen: np.ndarray):
    n = len(pos)
    color = np.zeros((n, 3), np.uint8)
    for c, rgb in CLASS_COLORS.items():
        color[sem == c] = rgb

    arrays = [
        ("position", "float32", 3, pos.astype("<f4")),
        ("color", "uint8", 3, color),
        ("semantic", "uint8", 1, sem.astype(np.uint8)),
        ("instance", "uint16", 1, inst.astype("<u2")),
        ("hag", "uint16", 1, np.clip(np.round(hag * 100), 0, 65534).astype("<u2")),
        ("tSeen", "uint16", 1, t_seen.astype("<u2")),
    ]
    attrs, offset = [], 0
    with open(out / "cloud.bin", "wb") as f:
        for name, typ, size, arr in arrays:
            data = np.ascontiguousarray(arr).tobytes()
            attrs.append({"name": name, "type": typ, "size": size, "byteOffset": offset, "byteLength": len(data)})
            f.write(data)
            offset += len(data)
            pad = (-offset) % 4
            f.write(b"\0" * pad)
            offset += pad

    write_json(out / "cloud.json", {
        "version": 1,
        "count": int(n),
        "bbox": {"min": pos.min(0).round(3).tolist(), "max": pos.max(0).round(3).tolist()},
        "classes": {str(k): v for k, v in CLASS_NAMES.items()},
        "attributes": attrs,
    })


def compute_t_seen(pos: np.ndarray, traj: np.ndarray, step: int = 5) -> np.ndarray:
    """First time (0.1 s units) a point was within REVEAL_RANGE_M (XY) of the sensor."""
    t_seen = np.full(len(pos), T_SEEN_NEVER, np.uint16)
    unseen = np.ones(len(pos), bool)
    r2 = REVEAL_RANGE_M ** 2
    xy = pos[:, :2]
    for t, x, y in traj[::step, :3]:
        idx = np.flatnonzero(unseen)
        if not len(idx):
            break
        d2 = (xy[idx, 0] - x) ** 2 + (xy[idx, 1] - y) ** 2
        hit = idx[d2 <= r2]
        t_seen[hit] = min(int(round(t * 10)), T_SEEN_NEVER - 1)
        unseen[hit] = False
    return t_seen


def export_trajectory(out: Path, traj_csv: Path, offset: np.ndarray, ground: GroundGrid) -> np.ndarray:
    raw = np.genfromtxt(traj_csv, delimiter=",", names=True)
    t = raw["t"] - raw["t"][0]
    x = raw["x"] - offset[0]
    y = raw["y"] - offset[1]
    # Trajectory Z is in a different vertical datum than the cloud → drape on ground + sensor height.
    z = ground(raw["x"], raw["y"]) - offset[2] + SENSOR_HEIGHT_M
    # Smooth Z and derive yaw from smoothed velocity (no orientation in traj.csv).
    k = np.ones(9) / 9
    zs = np.convolve(np.pad(z, 4, mode="edge"), k, mode="valid")
    xs = np.convolve(np.pad(x, 4, mode="edge"), k, mode="valid")
    ys = np.convolve(np.pad(y, 4, mode="edge"), k, mode="valid")
    yaw = np.unwrap(np.arctan2(np.gradient(ys), np.gradient(xs)))
    yaw = np.convolve(np.pad(yaw, 4, mode="edge"), k, mode="valid")
    samples = np.column_stack([t, x, y, zs, yaw])
    duration = float(t[-1])
    write_json(out / "trajectory.json", {
        "rateHz": round(len(t) / duration, 2) if duration > 0 else 10,
        "durationS": round(duration, 3),
        "sensorHeightM": SENSOR_HEIGHT_M,
        "videoOffsetS": 0,
        "samples": [[round(float(v), 4) for v in row] for row in samples],
    })
    return samples


def export_trees(out: Path, trees_csv: Path, offset: np.ndarray, src: Path, centroids: dict[int, np.ndarray]) -> list[dict]:
    """`centroids` (instance id → source-frame [x, y, ground_z]) places rejected instances that have no fitted base."""
    from PIL import Image

    thumbs = out / "media" / "thumbs"
    thumbs.mkdir(parents=True, exist_ok=True)
    trees = []
    with open(trees_csv) as f:
        for r in csv.DictReader(f):
            tid = int(r["instance_id"])
            valid = truthy(r["fp_valid"])
            bx, by, bz = (num(r["base_x"]), num(r["base_y"]), num(r["base_z"]))
            tx, ty, tz = (num(r["top_x"]), num(r["top_y"]), num(r["top_z"]))
            if bx is None:  # rejected instance without a fitted base — place at its point centroid on the ground
                if tid not in centroids:
                    continue
                bx, by, bz = centroids[tid].tolist()
            if tx is None:
                tx, ty, tz = bx, by, bz
            biomass = num(r["biomass_kg"])
            carbon = biomass * 0.5 if biomass is not None else None
            qsm = r["qsm_status"] or "not_run"
            if qsm == "ok" and truthy(r["qsm_incomplete"]):
                qsm = "partial"
            nn_id = num(r["nn_id"])
            tree = {
                "id": tid,
                "valid": valid,
                "species": SPECIES,
                "base": [round(bx - offset[0], 3), round(by - offset[1], 3), round(bz - offset[2], 3)],
                "top": [round(tx - offset[0], 3), round(ty - offset[1], 3), round(tz - offset[2], 3)],
                "dbhCm": num(r["fp_dbh_cm"]),
                "dbhCmQsm": num(r["qsm_dbh_cm"]),
                "dbhConfidence": r["fp_dbh_confidence"] or None,
                "heightM": num(r["fp_height_m"]),
                "heightMQsm": num(r["qsm_height_m"]),
                "basalAreaM2": num(r["basal_area_m2"]),
                "volumeM3": num(r["volume_m3"]),
                "biomassKg": biomass,
                "carbonKg": carbon,
                "co2eKg": carbon * 3.667 if carbon is not None else None,
                "crownRadiusM": num(r["crown_radius_m"]),
                "stemTiltDeg": num(r["fp_stem_tilt_deg"]),
                "nnDistM": num(r["nn_dist_m"]),
                "nnId": int(nn_id) if nn_id is not None else None,
                "wellSpaced": truthy(r["well_spaced"]),
                "thinRemove": truthy(r["thin_remove"]),
                "qsmStatus": qsm,
                "nPoints": int(float(r["n_points"] or 0)),
            }
            if not valid and r["fp_reject_reason"]:
                tree["rejectReason"] = r["fp_reject_reason"]
            thumb = src / "trees" / str(tid) / "thumbnail.png"
            if thumb.exists():
                im = Image.open(thumb).convert("RGB")
                im.thumbnail((360, 360))
                im.save(thumbs / f"{tid}.jpg", quality=82)
                tree["thumbnail"] = f"media/thumbs/{tid}.jpg"
            trees.append({k: clean(v) for k, v in tree.items()})
    write_json(out / "trees.json", trees)
    return trees


def summary_from(src: Path) -> dict:
    s = json.loads((src / "plot_summary.json").read_text())
    carbon = s["biomass_t"] * 0.5
    return {
        "plotAreaM2": s["plot_area_m2"], "nInstances": s["n_instances"], "nValidTrees": s["n_valid_trees"],
        "nRejected": s["n_rejected"], "stemsPerHa": s["stems_per_ha"], "dbhCmMean": s["dbh_cm_mean"],
        "dbhCmMedian": s["dbh_cm_median"], "dbhCmMin": s["dbh_cm_min"], "dbhCmMax": s["dbh_cm_max"],
        "quadraticMeanDbhCm": s["quadratic_mean_dbh_cm"], "heightMMean": s["height_m_mean"],
        "heightMMax": s["height_m_max"], "basalAreaM2": s["basal_area_m2"],
        "basalAreaM2PerHa": s["basal_area_m2_per_ha"], "woodVolumeM3": s["wood_volume_m3"],
        "woodVolumeM3PerHa": s["wood_volume_m3_per_ha"], "biomassT": s["biomass_t"],
        "biomassTPerHa": s["biomass_t_per_ha"], "carbonT": round(carbon, 4), "co2eT": round(carbon * 3.667, 4),
        "nSpacingConflictTrees": s["n_spacing_conflict_trees"], "nThinningRemove": s["n_thinning_remove"],
    }


# ───────────────────────────── main ─────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path, help="pipeline output dir, e.g. testdata/fariy_1_test")
    ap.add_argument("out", type=Path, help="output plot dir, e.g. public/data/plots/sample")
    ap.add_argument("--points", type=int, default=300_000)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    src, out = args.src, args.out
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    rgb_ply = next((src / "visuals").glob("*_semantic_rgb.ply"))
    print(f"reading {rgb_ply} …")
    a = read_ply(rgb_ply)
    xyz = np.column_stack([a["x"], a["y"], a["z"]])
    sem = a["semantic"].astype(np.int16)
    inst = a["instance"].astype(np.int32)
    inst[inst < 0] = 0

    ground_mask = sem == 0
    offset = np.array([
        (xyz[:, 0].min() + xyz[:, 0].max()) / 2,
        (xyz[:, 1].min() + xyz[:, 1].max()) / 2,
        np.percentile(xyz[ground_mask, 2], 5),
    ])
    ground = GroundGrid(xyz[ground_mask, 0], xyz[ground_mask, 1], xyz[ground_mask, 2])

    centroids = {}
    for tid in np.unique(inst[inst > 0]):
        m = inst == tid
        cx, cy = xyz[m, 0].mean(), xyz[m, 1].mean()
        centroids[int(tid)] = np.array([cx, cy, float(ground(np.array([cx]), np.array([cy]))[0])])

    rng = np.random.default_rng(args.seed)
    n = min(args.points, len(a))
    keep = np.sort(rng.choice(len(a), n, replace=False))
    xyz, sem, inst = xyz[keep], sem[keep], inst[keep]
    hag = np.maximum(xyz[:, 2] - ground(xyz[:, 0], xyz[:, 1]), 0)
    pos = xyz - offset
    print(f"  {n:,} of {len(a):,} points; offset {offset.round(3).tolist()}")

    traj_csv = src / "traj.csv"
    t_seen = np.full(n, 0, np.uint16)
    has_traj = traj_csv.exists()
    if has_traj:
        samples = export_trajectory(out, traj_csv, offset, ground)
        t_seen = compute_t_seen(pos, samples)
        print(f"  trajectory: {len(samples)} samples, {samples[-1, 0]:.1f} s")

    export_cloud(out, pos, sem, inst, hag, t_seen)
    trees = export_trees(out, src / "trees.csv", offset, src, centroids)
    print(f"  trees: {len(trees)} ({sum(t['valid'] for t in trees)} valid)")

    charts = {}
    (out / "media").mkdir(exist_ok=True)
    for png in sorted((src / "visuals").glob("*.png")):
        shutil.copy(png, out / "media" / png.name)
        charts[png.stem] = f"media/{png.name}"

    files = {"cloud": "cloud.json", "trees": "trees.json", "charts": charts}
    if has_traj:
        files["trajectory"] = "trajectory.json"
    write_json(out / "plot.json", {
        "id": out.name,
        "name": "Plot FR-01 (sample)",
        "captureDate": "2026-09-30T16:28:35+05:00",
        "device": "TimberSense Backpack TS-01",
        "operator": "Field crew A",
        "species": [SPECIES],
        "geo": {"lat": 33.8086, "lon": 73.5237},
        "offset": offset.round(4).tolist(),
        "files": files,
        "summary": summary_from(src),
    })
    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"wrote {out} ({size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
