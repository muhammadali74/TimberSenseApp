#!/usr/bin/env python3
"""
WS-A: export one processed TimberSense plot into the web formats defined in PLAN.md §5.

    python3 tools/prepare_plot.py testdata/fariy_1_test public/data/plots/fariy_1_test

Input (pipeline output dir):
    visuals/*_semantic_rgb.ply           xyz + semantic + instance          (required)
    forest_pipeline/*_hag.ply            per-point height above ground      (optional, same point order)
    forest_pipeline/*_dtm_complete.ply   ground model points                (optional, falls back to *_dtm.ply / ground points)
    trees.csv, plot_summary.json         per-tree + plot metrics            (required)
    trees/<id>/thumbnail.png, qsm_mesh.ply                                  (optional)
    traj.tum                             t x y z qx qy qz qw SLAM poses     (optional; preferred → positions + heading)
    traj.csv                             t,x,y,z sensor positions           (optional; used when there is no traj.tum)
                                         Both must be in the cloud's frame (traj.tum of fariy_1_test was shifted
                                         into the segmentation pipeline's frame; original in traj_backup.tum).
    visuals/*.png                        report charts                      (optional)
    *.mp4                                front camera video                 (optional)
    *_intrinsics.json                    pinhole intrinsics of that video   (optional → camera.json)
                                         written by hevc_to_mp4.py --undistort

Output (plot dir): plot.json, cloud.json + cloud.bin, trees.json, trajectory.json, dtm.glb, camera.json,
media/{thumbs,qsm,video}/, media/*.png. Existing media/video/ renditions are reused unless --force-video.

Dependencies: numpy, scipy, Pillow; ffmpeg for video.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import struct
import subprocess
import time
from pathlib import Path

import numpy as np
from scipy.interpolate import LinearNDInterpolator
from scipy.spatial import ConvexHull, Delaunay, cKDTree

TOOLS = Path(__file__).resolve().parent

CLASS_NAMES = {0: "ground", 1: "wood", 2: "leaves"}
SPECIES = "Chir pine"
SENSOR_HEIGHT_M = 1.8
# Visual "capture" radius for the replay reveal (the lidar sees further; smaller reads better on screen).
REVEAL_RANGE_M = 6.0
T_SEEN_NEVER = 65535
DTM_MAX_EDGE_M = 1.0

# Kotli Sattian (Murree Hills) — approximate; override with --geo when the plot's GPS fix is known.
DEFAULT_GEO = (33.8086, 73.5237)

PLY_TYPES = {
    "double": "<f8", "float": "<f4", "float32": "<f4", "float64": "<f8", "uchar": "u1", "uint8": "u1",
    "char": "i1", "int8": "i1", "ushort": "<u2", "uint16": "<u2", "short": "<i2", "int16": "<i2",
    "uint": "<u4", "uint32": "<u4", "int": "<i4", "int32": "<i4",
}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ════════════════════════════════ IO ════════════════════════════════

def read_ply(path: Path) -> tuple[np.ndarray, np.ndarray | None]:
    """Binary little-endian PLY → (vertex structured array, triangle indices or None)."""
    with open(path, "rb") as f:
        elements: list[dict] = []
        while True:
            line = f.readline().decode("ascii", "replace").strip()
            if line.startswith("format") and "binary_little_endian" not in line:
                raise ValueError(f"{path}: only binary_little_endian PLY is supported")
            if line.startswith("element"):
                _, name, count = line.split()
                elements.append({"name": name, "count": int(count), "props": []})
            elif line.startswith("property"):
                parts = line.split()
                if parts[1] == "list":
                    elements[-1]["list"] = (PLY_TYPES[parts[2]], PLY_TYPES[parts[3]])
                else:
                    elements[-1]["props"].append((parts[2], PLY_TYPES[parts[1]]))
            elif line == "end_header":
                break
        verts, faces = None, None
        for el in elements:
            if el["name"] == "vertex":
                verts = np.fromfile(f, dtype=np.dtype(el["props"]), count=el["count"])
            elif el["name"] == "face":
                ctype, itype = el["list"]
                # Assume triangles (all pipeline meshes are); verify below.
                raw = np.fromfile(f, dtype=np.dtype([("n", ctype), ("v", itype, 3)]), count=el["count"])
                if len(raw) and not (raw["n"] == 3).all():
                    raise ValueError(f"{path}: only triangle faces are supported")
                faces = raw["v"].astype(np.uint32)
            else:
                raise ValueError(f"{path}: unsupported element {el['name']}")
        assert verts is not None
        return verts, faces


def write_json(path: Path, obj, indent: int | None = 1) -> None:
    path.write_text(json.dumps(obj, indent=indent, allow_nan=False))


def write_glb(path: Path, positions: np.ndarray, indices: np.ndarray, colors: np.ndarray | None = None,
              normals: np.ndarray | None = None) -> None:
    """Minimal glTF 2.0 binary writer: one mesh, one primitive (triangles)."""
    positions = np.ascontiguousarray(positions, "<f4")
    indices = np.ascontiguousarray(indices.reshape(-1), "<u4")
    chunks: list[bytes] = []
    views, accessors, attributes = [], [], {}

    def add(data: bytes, target: int, accessor: dict) -> int:
        offset = sum(len(c) for c in chunks)
        chunks.append(data + b"\0" * ((-len(data)) % 4))
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data), "target": target})
        accessors.append({**accessor, "bufferView": len(views) - 1})
        return len(accessors) - 1

    attributes["POSITION"] = add(positions.tobytes(), 34962, {
        "componentType": 5126, "count": len(positions), "type": "VEC3",
        "min": positions.min(0).tolist(), "max": positions.max(0).tolist()})
    if normals is not None:
        attributes["NORMAL"] = add(np.ascontiguousarray(normals, "<f4").tobytes(), 34962,
                                   {"componentType": 5126, "count": len(normals), "type": "VEC3"})
    if colors is not None:
        # glTF COLOR_0 is linear; inputs are sRGB uint8 → linear float32.
        c = colors[:, :3].astype(np.float64) / 255.0
        lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        rgb = np.ascontiguousarray(lin, "<f4")
        attributes["COLOR_0"] = add(rgb.tobytes(), 34962, {"componentType": 5126, "count": len(rgb), "type": "VEC3"})
    idx = add(indices.tobytes(), 34963, {"componentType": 5125, "count": len(indices), "type": "SCALAR"})

    gltf = {
        "asset": {"version": "2.0", "generator": "TimberSense prepare_plot.py"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": attributes, "indices": idx, "mode": 4}]}],
        "buffers": [{"byteLength": sum(len(c) for c in chunks)}],
        "bufferViews": views, "accessors": accessors,
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    bin_ = b"".join(chunks)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(bin_), 0x004E4942) + bin_)


def vertex_normals(pos: np.ndarray, tri: np.ndarray) -> np.ndarray:
    fn = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
    n = np.zeros_like(pos)
    for k in range(3):
        np.add.at(n, tri[:, k], fn)
    n /= np.linalg.norm(n, axis=1, keepdims=True).clip(1e-9)
    return n


# ════════════════════════════════ CSV helpers ════════════════════════════════

def num(v):
    if v is None or v == "" or str(v).lower() == "nan":
        return None
    return float(v)


def truthy(v) -> bool:
    return str(v).strip().lower() in ("true", "1", "yes")


def clean(v, digits: int = 4):
    if isinstance(v, float):
        return None if math.isnan(v) else round(v, digits)
    return v


# ════════════════════════════════ ground model ════════════════════════════════

class Ground:
    """Ground height lookup from DTM points: linear inside the hull, nearest outside."""

    def __init__(self, xyz: np.ndarray):
        self.xyz = xyz
        self.lin = LinearNDInterpolator(xyz[:, :2], xyz[:, 2])
        self.kd = cKDTree(xyz[:, :2])

    def __call__(self, x, y) -> np.ndarray:
        x, y = np.atleast_1d(x).astype(float), np.atleast_1d(y).astype(float)
        z = self.lin(x, y)
        miss = np.isnan(z)
        if miss.any():
            _, i = self.kd.query(np.column_stack([x[miss], y[miss]]))
            z[miss] = self.xyz[i, 2]
        return z


def load_dtm_points(src: Path, ground_xyz: np.ndarray) -> np.ndarray:
    fp = src / "forest_pipeline"
    for pat in ("*_dtm_complete.ply", "*_dtm.ply"):
        hits = sorted(fp.glob(pat)) if fp.exists() else []
        if hits:
            v, _ = read_ply(hits[0])
            log(f"DTM: {hits[0].name} ({len(v):,} pts)")
            return np.column_stack([v["x"], v["y"], v["z"]])
    # Fallback: 0.25 m grid minimum of ground-class points.
    log("DTM: none found, deriving from ground points")
    key = np.floor(ground_xyz[:, :2] / 0.25).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    zmin = np.full(inv.max() + 1, np.inf)
    np.minimum.at(zmin, inv, ground_xyz[:, 2])
    first = np.unique(inv, return_index=True)[1]
    return np.column_stack([ground_xyz[first, :2], zmin])


# ════════════════════════════════ synthetic natural colour ════════════════════════════════

def _hash01(ix: np.ndarray, iy: np.ndarray, seed: int) -> np.ndarray:
    h = (ix.astype(np.uint64) * np.uint64(73856093)) ^ (iy.astype(np.uint64) * np.uint64(19349663)) ^ np.uint64(
        seed * 83492791)
    h &= np.uint64(0xFFFFFFFF)
    h ^= h >> np.uint64(13)
    h = (h * np.uint64(0x5BD1E995)) & np.uint64(0xFFFFFFFF)
    h ^= h >> np.uint64(15)
    return h.astype(np.float64) / 4294967296.0


def value_noise(u: np.ndarray, v: np.ndarray, seed: int = 0) -> np.ndarray:
    """Smooth 2D value noise in [0, 1]; (u, v) already divided by the cell size."""
    iu, iv = np.floor(u), np.floor(v)
    fu, fv = u - iu, v - iv
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    iu, iv = iu.astype(np.int64) + 1_000_000, iv.astype(np.int64) + 1_000_000
    a, b = _hash01(iu, iv, seed), _hash01(iu + 1, iv, seed)
    c, d = _hash01(iu, iv + 1, seed), _hash01(iu + 1, iv + 1, seed)
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv


def fbm(u, v, seed=0, octaves=3):
    total, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        total = total + amp * value_noise(u * 2 ** o, v * 2 ** o, seed + o * 101)
        norm += amp
        amp *= 0.5
    return total / norm


def lerp(a, b, t):
    t = np.asarray(t)[..., None]
    return np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t


def synth_colors(pos: np.ndarray, sem: np.ndarray, inst: np.ndarray, hag: np.ndarray, trees: list[dict],
                 seed: int) -> np.ndarray:
    """Natural-looking RGB from class + height (no camera colourisation available yet)."""
    rng = np.random.default_rng(seed)
    n = len(pos)
    rgb = np.zeros((n, 3), float)
    x, y, z = pos[:, 0], pos[:, 1], pos[:, 2]

    # Per-tree lookups (indexed by instance id).
    max_id = int(max(inst.max(), max((t["id"] for t in trees), default=0))) + 1
    base_x, base_y = np.zeros(max_id), np.zeros(max_id)
    height = np.full(max_id, 6.0)
    for t in trees:
        base_x[t["id"]], base_y[t["id"]] = t["base"][0], t["base"][1]
        h = t.get("heightM")
        if h:
            height[t["id"]] = max(h, 1.0)
    tint = 1 + rng.uniform(-0.09, 0.09, (max_id, 3))
    tint[:, 1] = tint[:, 0] * 0.6 + tint[:, 1] * 0.4  # keep tints mostly in brightness/warmth

    # ── ground: grass, darker grass, bare soil, pine-needle litter around stems ──
    g = sem == 0
    if g.any():
        gx, gy = x[g], y[g]
        large = fbm(gx / 4.0, gy / 4.0, seed + 1)
        fine = fbm(gx / 0.6, gy / 0.6, seed + 2)
        col = lerp((62, 88, 40), (126, 146, 66), fine)  # dark → sunlit grass
        soil = np.clip((0.35 - large) / 0.15, 0, 1)
        col = col * (1 - soil[:, None]) + lerp((104, 86, 64), (138, 114, 84), fine)[...] * soil[:, None]
        if trees:
            bases = np.array([[t["base"][0], t["base"][1]] for t in trees if t["valid"]] or [[1e9, 1e9]])
            d, _ = cKDTree(bases).query(np.column_stack([gx, gy]))
            litter = np.clip(1 - d / 2.2, 0, 1) ** 1.5 * (0.55 + 0.45 * fine)
            col = col * (1 - litter[:, None]) + lerp((118, 84, 52), (158, 116, 72), fine) * litter[:, None]
        rgb[g] = col

    # ── wood: fissured reddish-grey Chir pine bark, darker near the base ──
    w = sem == 1
    if w.any():
        wi = inst[w]
        dx, dy = x[w] - base_x[wi], y[w] - base_y[wi]
        theta = np.arctan2(dy, dx)
        plates = fbm(theta * 6.0, z[w] / 0.22, seed + 3, octaves=2)  # vertically elongated plates
        fissure = value_noise(theta * 22.0, z[w] / 0.08, seed + 4)
        t = np.clip(plates * 0.8 + fissure * 0.35 - 0.15, 0, 1)
        col = lerp((58, 42, 34), (138, 108, 86), t)
        col *= (0.72 + 0.28 * np.clip(hag[w] / 1.2, 0, 1))[:, None]
        col *= tint[wi]
        rgb[w] = col

    # ── leaves: needle greens, lighter towards the crown top ──
    lv = sem == 2
    if lv.any():
        li = inst[lv]
        rel = np.clip(hag[lv] / height[li], 0, 1)
        clump = fbm((x[lv] + z[lv] * 0.7) / 0.35, (y[lv] - z[lv] * 0.7) / 0.35, seed + 5, octaves=2)
        t = np.clip(0.25 + 0.55 * rel + 0.45 * (clump - 0.5), 0, 1)
        col = lerp((34, 64, 28), (118, 150, 64), t)
        col *= tint[li]
        rgb[lv] = col

    # Per-point grain so it reads as a real scan, not flat shading.
    rgb *= (1 + rng.normal(0, 0.06, n))[:, None]
    rgb += rng.normal(0, 3, (n, 3))
    return np.clip(np.round(rgb), 0, 255).astype(np.uint8)


# ════════════════════════════════ exporters ════════════════════════════════

def export_cloud(out: Path, pos, color, sem, inst, hag, t_seen) -> None:
    arrays = [
        ("position", "float32", 3, pos.astype("<f4")),
        ("color", "uint8", 3, color.astype(np.uint8)),
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
        "count": int(len(pos)),
        "bbox": {"min": pos.min(0).round(3).tolist(), "max": pos.max(0).round(3).tolist()},
        "classes": {str(k): v for k, v in CLASS_NAMES.items()},
        "attributes": attrs,
    })


def compute_t_seen(pos: np.ndarray, samples: np.ndarray, step_s: float = 0.5) -> np.ndarray:
    """First trajectory time (0.1 s units) at which each point was within REVEAL_RANGE_M (XY) of the sensor."""
    t_seen = np.full(len(pos), T_SEEN_NEVER, np.uint16)
    unseen = np.arange(len(pos))
    xy = pos[:, :2].astype(np.float32)
    r2 = REVEAL_RANGE_M ** 2
    next_t = -1.0
    for t, sx, sy in samples[:, :3]:
        if t < next_t:
            continue
        next_t = t + step_s
        if not len(unseen):
            break
        d2 = (xy[unseen, 0] - sx) ** 2 + (xy[unseen, 1] - sy) ** 2
        hit = d2 <= r2
        t_seen[unseen[hit]] = min(int(round(t * 10)), T_SEEN_NEVER - 1)
        unseen = unseen[~hit]
    # Points never within range appear at the end, so a finished replay shows the complete cloud.
    t_seen[unseen] = min(int(round(samples[-1, 0] * 10)), T_SEEN_NEVER - 1)
    return t_seen


def heading_from_tum(tum: Path, t_abs: np.ndarray) -> np.ndarray | None:
    """Heading (rad, CCW from +X, unwrapped) of the lidar body's +X axis from SLAM orientation (TUM:
    t x y z qx qy qz qw), sampled at the trajectory times. Body +X is the forward direction: while
    walking it stays within 30° of the walking direction 99.6% of the time (fariy_1_test).
    The plot frame differs from the SLAM frame only by a translation, so the heading carries over."""
    d = np.loadtxt(tum, ndmin=2)
    if d.shape[1] < 8 or len(d) < 2:
        return None
    tt = d[:, 0]
    qx, qy, qz, qw = (d[:, i] for i in range(4, 8))
    yaw = np.unwrap(np.arctan2(2 * (qx * qy + qz * qw), 1 - 2 * (qy * qy + qz * qz)))
    if t_abs[0] < tt[0] - 0.05 or t_abs[-1] > tt[-1] + 0.05:
        log(f"heading: {tum.name} does not cover the trajectory ({tt[0]:.2f}-{tt[-1]:.2f} s), using walking direction")
        return None
    return np.interp(t_abs, tt, yaw)


def read_positions(src: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, Path] | None:
    """(t_abs, x, y, file) of the sensor path: traj.tum when present, else traj.csv. None if neither exists."""
    tum, csv_ = src / "traj.tum", src / "traj.csv"
    if tum.exists():
        d = np.loadtxt(tum, comments="#", ndmin=2)
        return d[:, 0], d[:, 1], d[:, 2], tum
    if csv_.exists():
        raw = np.genfromtxt(csv_, delimiter=",", names=True)
        return raw["t"], raw["x"], raw["y"], csv_
    return None


def export_trajectory(out: Path, src: Path, offset: np.ndarray, ground: Ground, sensor_h: float) -> np.ndarray | None:
    pos = read_positions(src)
    if pos is None:
        return None
    t_abs, x, y, pos_file = pos
    log(f"trajectory positions: {pos_file.name}")
    t = t_abs - t_abs[0]
    # XY must be in the cloud's frame; the SLAM vertical datum isn't used → drape on the DTM + sensor height.
    z = ground(x, y) + sensor_h

    def smooth(a, k=9):
        return np.convolve(np.pad(a, k // 2, mode="edge"), np.ones(k) / k, mode="valid")

    xs, ys, zs = smooth(x), smooth(y), smooth(z, 15)
    # Heading: real SLAM orientation when traj.tum is available, else derived from the walking direction.
    tum = src / "traj.tum"
    yaw = heading_from_tum(tum, t_abs) if tum.exists() else None
    yaw_source = "orientation" if yaw is not None else "velocity"
    if yaw is None:
        yaw = smooth(np.unwrap(np.arctan2(np.gradient(smooth(ys, 15)), np.gradient(smooth(xs, 15)))), 15)
    log(f"trajectory heading: {yaw_source}" + (f" ({tum.name})" if yaw_source == "orientation" else ""))
    samples = np.column_stack([t, x - offset[0], y - offset[1], zs - offset[2], yaw])
    duration = float(t[-1])
    write_json(out / "trajectory.json", {
        "rateHz": round((len(t) - 1) / duration, 2) if duration > 0 else 10,
        "durationS": round(duration, 3),
        "sensorHeightM": sensor_h,
        "videoOffsetS": 0,
        "yawSource": yaw_source,
        "samples": [[round(float(v), 4) for v in row] for row in samples],
    }, indent=None)
    return samples


def load_dbh_rings(src: Path) -> tuple[dict[int, np.ndarray], dict[int, float]]:
    """*_dbh_cylinders.ply → {instance id: (n_rings, pts_per_ring, 3)} and *_dbh.csv h* (DBH height)."""
    fp = src / "forest_pipeline"
    hits = sorted(fp.glob("*_dbh_cylinders.ply")) if fp.exists() else []
    rings: dict[int, np.ndarray] = {}
    if hits:
        v, _ = read_ply(hits[0])
        xyz = np.column_stack([v["x"], v["y"], v["z"]])
        ids = v["instance_id"].astype(int)
        for tid in np.unique(ids):
            pts = xyz[ids == tid]
            # Rings are stored as contiguous blocks; pick the block count that gives the roundest circles.
            best = None
            for k in (5, 4, 3, 6, 7, 8, 2, 1):
                if len(pts) % k:
                    continue
                blocks = pts.reshape(k, -1, 3)
                c = blocks.mean(1, keepdims=True)
                spread = np.linalg.norm(blocks - c, axis=2).std(1).max()
                if best is None or spread < best[0] - 1e-6:
                    best = (spread, blocks)
            if best is not None and best[0] < 0.01:
                rings[int(tid)] = best[1]
    h_star = {}
    dbh_csv = sorted(fp.glob("*_dbh.csv")) if fp.exists() else []
    if dbh_csv:
        with open(dbh_csv[0]) as f:
            for r in csv.DictReader(f):
                if num(r.get("h_star")) is not None:
                    h_star[int(r["instance_id"])] = float(r["h_star"])
    return rings, h_star


def ring_params(blocks: np.ndarray, offset: np.ndarray) -> list[dict]:
    out = []
    for ring in blocks:
        c = ring.mean(0)
        normal = np.linalg.svd(ring - c)[2][-1]
        if normal[2] < 0:
            normal = -normal
        out.append({
            "center": [round(float(v), 4) for v in (c - offset)],
            "normal": [round(float(v), 5) for v in normal],
            "radiusM": round(float(np.linalg.norm(ring - c, axis=1).mean()), 4),
        })
    out.sort(key=lambda r: r["center"][2])
    return out


def export_trees(out: Path, src: Path, offset: np.ndarray, ground: Ground, centroids: dict, with_qsm: bool) -> list:
    from PIL import Image

    dbh_rings, h_star = load_dbh_rings(src)

    (out / "media" / "thumbs").mkdir(parents=True, exist_ok=True)
    if with_qsm:
        (out / "media" / "qsm").mkdir(parents=True, exist_ok=True)
    trees = []
    with open(src / "trees.csv") as f:
        for r in csv.DictReader(f):
            tid = int(r["instance_id"])
            valid = truthy(r["fp_valid"])
            base = [num(r["base_x"]), num(r["base_y"]), num(r["base_z"])]
            top = [num(r["top_x"]), num(r["top_y"]), num(r["top_z"])]
            if base[0] is None:
                if tid not in centroids:
                    continue
                cx, cy = centroids[tid]
                base = [cx, cy, float(ground(cx, cy)[0])]
            if top[0] is None:
                top = list(base)
            biomass = num(r["biomass_kg"])
            carbon = biomass * 0.5 if biomass is not None else None
            qsm = r["qsm_status"] or "not_run"
            if qsm == "ok" and truthy(r["qsm_incomplete"]):
                qsm = "partial"
            nn_id = num(r["nn_id"])
            tree = {
                "id": tid, "valid": valid, "species": SPECIES,
                "base": [round(base[i] - offset[i], 3) for i in range(3)],
                "top": [round(top[i] - offset[i], 3) for i in range(3)],
                "dbhCm": num(r["fp_dbh_cm"]), "dbhCmQsm": num(r["qsm_dbh_cm"]),
                "dbhConfidence": r["fp_dbh_confidence"] or None,
                "heightM": num(r["fp_height_m"]), "heightMQsm": num(r["qsm_height_m"]),
                "basalAreaM2": num(r["basal_area_m2"]), "volumeM3": num(r["volume_m3"]),
                "biomassKg": biomass, "carbonKg": carbon,
                "co2eKg": carbon * 3.667 if carbon is not None else None,
                "crownRadiusM": num(r["crown_radius_m"]), "stemTiltDeg": num(r["fp_stem_tilt_deg"]),
                "nnDistM": num(r["nn_dist_m"]), "nnId": int(nn_id) if nn_id is not None else None,
                "wellSpaced": truthy(r["well_spaced"]), "thinRemove": truthy(r["thin_remove"]),
                "qsmStatus": qsm, "nPoints": int(float(r["n_points"] or 0)),
            }
            if not valid and r["fp_reject_reason"]:
                tree["rejectReason"] = r["fp_reject_reason"]
            if tid in dbh_rings:
                rings = ring_params(dbh_rings[tid], offset)
                tree["dbhRings"] = rings
                # The DBH ring sits at h* above the stem base (pipeline's breast-height section).
                target_z = base[2] - offset[2] + h_star.get(tid, 1.3)
                tree["dbhRingIndex"] = int(np.argmin([abs(rg["center"][2] - target_z) for rg in rings]))

            tdir = src / "trees" / str(tid)
            if (tdir / "thumbnail.png").exists():
                im = Image.open(tdir / "thumbnail.png").convert("RGB")
                im.thumbnail((360, 360))
                im.save(out / "media" / "thumbs" / f"{tid}.jpg", quality=84)
                tree["thumbnail"] = f"media/thumbs/{tid}.jpg"
            if with_qsm and (tdir / "qsm_mesh.ply").exists():
                v, tri = read_ply(tdir / "qsm_mesh.ply")
                if tri is not None and len(tri):
                    p = np.column_stack([v["x"], v["y"], v["z"]]).astype(float) - offset
                    cols = np.column_stack([v["red"], v["green"], v["blue"]]) if "red" in v.dtype.names else None
                    write_glb(out / "media" / "qsm" / f"{tid}.glb", p, tri, cols, vertex_normals(p, tri))
                    tree["qsmMesh"] = f"media/qsm/{tid}.glb"
            trees.append({k: clean(val) for k, val in tree.items()})
    write_json(out / "trees.json", trees)
    return trees


def export_dtm(out: Path, dtm_xyz: np.ndarray, offset: np.ndarray, seed: int, ground_xy: np.ndarray) -> None:
    # *_dtm_complete is extrapolated beyond the scan; keep only vertices near real ground points.
    near, _ = cKDTree(ground_xy[:: max(1, len(ground_xy) // 400_000)]).query(dtm_xyz[:, :2],
                                                                             distance_upper_bound=0.6)
    dtm_xyz = dtm_xyz[np.isfinite(near)]
    tri = Delaunay(dtm_xyz[:, :2]).simplices
    p = dtm_xyz[tri]
    edge = np.max([np.linalg.norm(p[:, i, :2] - p[:, (i + 1) % 3, :2], axis=1) for i in range(3)], axis=0)
    tri = tri[edge <= DTM_MAX_EDGE_M]
    pos = dtm_xyz - offset
    fine = fbm(pos[:, 0] / 0.8, pos[:, 1] / 0.8, seed + 9)
    cols = np.clip(lerp((70, 92, 46), (128, 140, 78), fine), 0, 255).astype(np.uint8)
    write_glb(out / "dtm.glb", pos, tri.astype(np.uint32), cols, vertex_normals(pos, tri))
    log(f"dtm.glb: {len(pos):,} verts, {len(tri):,} tris")


def plot_boundary(ground_xy: np.ndarray, offset: np.ndarray, lat: float, lon: float) -> list:
    """Convex hull of ground points → WGS84 ring (plot frame assumed X=east, Y=north)."""
    hull = ground_xy[ConvexHull(ground_xy).vertices] - offset[:2]
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * math.cos(math.radians(lat))
    ring = [[round(lon + px / m_per_deg_lon, 7), round(lat + py / m_per_deg_lat, 7)] for px, py in hull]
    return ring + [ring[0]]


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


def capture_date_from(video: Path | None, fallback: str) -> str:
    """Video files are named YYYYMMDD_HHMMSS_*; local time is PKT (+05:00)."""
    if video:
        m = re.match(r"(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})", video.name)
        if m:
            y, mo, d, h, mi, s = m.groups()
            return f"{y}-{mo}-{d}T{h}:{mi}:{s}+05:00"
    return fallback


def export_video(out: Path, video: Path, force: bool) -> tuple[dict, dict]:
    """Returns (files.video, files.videoRenditions). Renditions are listed best-first for WS-E's player."""
    vdir = out / "media" / "video"
    needed = [vdir / n for n in ("front_2160.mp4", "front_1080.mp4", "front_720.mp4", "front_poster.jpg")]
    if force or not all(f.exists() for f in needed):
        log(f"transcoding {video.name} incl. 4K (this takes several minutes)…")
        subprocess.run([str(TOOLS / "transcode.sh"), str(video), str(vdir), "front"], check=True)
    else:
        log("video: reusing existing renditions")
    candidates = [
        ("front_2160_hevc.mp4", "hevc", 2160),
        ("front_2160.mp4", "h264", 2160),
        ("front_1080.mp4", "h264", 1080),
        ("front_720.mp4", "h264", 720),
    ]
    renditions = [
        {"src": f"media/video/{name}", "codec": codec, "width": round(h * 16 / 9), "height": h}
        for name, codec, h in candidates
        if (vdir / name).exists()
    ]
    return {"front": "media/video/front_720.mp4"}, {"front": renditions}


def _fisheye_from_mat(mat_path: Path) -> dict | None:
    """Best effort: raw-lens fisheye model (MATLAB fisheyeParameters) for reference in camera.json."""
    try:
        import io
        import warnings

        import scipy.io as sio
        from scipy.io.matlab import _mio5

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            top = sio.loadmat(mat_path, squeeze_me=True, struct_as_record=False)
            raw = np.asarray(top["__function_workspace__"]).tobytes()
            f = io.BytesIO(b"MATLAB 5.0 MAT-file".ljust(116) + bytes(8) + raw[:4] + raw[8:])
            reader = _mio5.MatFile5Reader(f, squeeze_me=True, struct_as_record=False)
            reader.initialize_read()
            f.seek(128)
            hdr, _ = reader.read_var_header()
            stack = [reader.read_var_array(hdr, process=True)]
        while stack:
            o = stack.pop()
            if hasattr(o, "_fieldnames"):
                if {"MappingCoefficients", "DistortionCenter"} <= set(o._fieldnames):
                    return {
                        "model": "scaramuzza",
                        "mappingCoefficients": np.atleast_1d(np.asarray(o.MappingCoefficients, float)).tolist(),
                        # MATLAB is 1-based; stored 0-based like the pinhole K
                        "distortionCenter": (np.asarray(o.DistortionCenter, float) - 1).round(4).tolist(),
                        "stretchMatrix": np.asarray(o.StretchMatrix, float).reshape(2, 2).round(6).tolist(),
                        "imageSize": [int(v) for v in np.atleast_1d(o.ImageSize)][::-1],  # [width, height]
                    }
                stack.extend(getattr(o, k) for k in o._fieldnames)
            elif isinstance(o, np.ndarray) and o.dtype == object:
                stack.extend(o.flat)
            elif isinstance(o, np.ndarray) and o.dtype.names:
                stack.extend(x for name in o.dtype.names for x in o[name].flat)
    except Exception as e:  # noqa: BLE001 — reference data only
        log(f"camera: fisheye model not read from {mat_path} ({e})")
    return None


def export_camera(out: Path, src: Path) -> str | None:
    """camera.json (PLAN.md §5.2) from the *_intrinsics.json that hevc_to_mp4.py --undistort writes."""
    found = sorted(src.glob("*_intrinsics.json"))
    if not found:
        return None
    k = json.loads(found[0].read_text())
    w, h = int(k["width"]), int(k["height"])
    fx, fy, cx, cy = (float(k[n]) for n in ("fx", "fy", "cx", "cy"))
    cam = {
        "version": 1,
        "model": "pinhole",
        "width": w,
        "height": h,
        "fx": fx,
        "fy": fy,
        "cx": cx,
        "cy": cy,
        "hfovDeg": round(math.degrees(2 * math.atan(w / 2 / fx)), 3),
        "vfovDeg": round(math.degrees(2 * math.atan(h / 2 / fy)), 3),
        "source": {
            "tool": "hevc_to_mp4.py --undistort",
            "file": found[0].name,
            "scaleFactor": k.get("scale_factor"),
            "calibration": Path(k["calibration"]).name if k.get("calibration") else None,
        },
    }
    if k.get("calibration") and Path(k["calibration"]).is_file():
        fisheye = _fisheye_from_mat(Path(k["calibration"]))
        if fisheye:
            cam["fisheye"] = fisheye
    write_json(out / "camera.json", cam)
    log(f"camera.json: {w}x{h}, fx {fx:.1f}, FOV {cam['hfovDeg']}° x {cam['vfovDeg']}°")
    return "camera.json"


# ════════════════════════════════ main ════════════════════════════════

def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path, help="pipeline output dir, e.g. testdata/fariy_1_test")
    ap.add_argument("out", type=Path, help="plot dir, e.g. public/data/plots/fariy_1_test")
    ap.add_argument("--name", default="Plot FR-01")
    ap.add_argument("--points", type=int, default=0, help="random subsample size (0 = all points)")
    ap.add_argument("--geo", default=None, help="lat,lon of the plot centre (default: Kotli Sattian)")
    ap.add_argument("--sensor-height", type=float, default=SENSOR_HEIGHT_M)
    ap.add_argument("--video", type=Path, default=None, help="front camera video (default: *.mp4 in src)")
    ap.add_argument("--no-video", action="store_true")
    ap.add_argument("--force-video", action="store_true", help="re-transcode even if renditions exist")
    ap.add_argument("--no-qsm", action="store_true", help="skip per-tree QSM meshes")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args(argv)
    src, out = args.src, args.out
    t0 = time.time()

    # Clean the output but keep transcoded video (slow to regenerate).
    out.mkdir(parents=True, exist_ok=True)
    for p in out.iterdir():
        if p.name == "media":
            for q in p.iterdir():
                if q.name != "video":
                    shutil.rmtree(q) if q.is_dir() else q.unlink()
        else:
            shutil.rmtree(p) if p.is_dir() else p.unlink()

    # ── points ──
    rgb_ply = next((src / "visuals").glob("*_semantic_rgb.ply"))
    log(f"reading {rgb_ply.name}")
    a, _ = read_ply(rgb_ply)
    xyz = np.column_stack([a["x"], a["y"], a["z"]])
    sem = a["semantic"].astype(np.int16)
    inst = a["instance"].astype(np.int32)
    inst[inst < 0] = 0
    n_all = len(a)

    gmask = sem == 0
    ground_xy_all = xyz[gmask, :2].copy()
    dtm_xyz = load_dtm_points(src, xyz[gmask])
    ground = Ground(dtm_xyz)
    offset = np.array([(xyz[:, 0].min() + xyz[:, 0].max()) / 2, (xyz[:, 1].min() + xyz[:, 1].max()) / 2,
                       np.percentile(xyz[gmask, 2], 5)])

    hag_ply = sorted((src / "forest_pipeline").glob("*_hag.ply"))
    hag = None
    if hag_ply:
        h, _ = read_ply(hag_ply[0])
        if len(h) == n_all and np.allclose(h["x"][:1000], a["x"][:1000]):
            hag = h["HAG"].astype(np.float64)
            log(f"HAG: {hag_ply[0].name}")
    if hag is None:
        log("HAG: from DTM")
        hag = xyz[:, 2] - ground(xyz[:, 0], xyz[:, 1])
    hag = np.maximum(hag, 0)

    # Instance centroids (for rejected instances without a fitted base).
    centroids = {}
    order = np.argsort(inst, kind="stable")
    ids, starts = np.unique(inst[order], return_index=True)
    for tid, grp in zip(ids, np.split(order, starts[1:])):
        if tid > 0:
            centroids[int(tid)] = (float(xyz[grp, 0].mean()), float(xyz[grp, 1].mean()))

    if args.points and args.points < n_all:
        keep = np.sort(np.random.default_rng(args.seed).choice(n_all, args.points, replace=False))
        xyz, sem, inst, hag = xyz[keep], sem[keep], inst[keep], hag[keep]
    pos = xyz - offset
    log(f"points: {len(pos):,} of {n_all:,}; offset {offset.round(3).tolist()}")

    # ── trees, trajectory, colour, tSeen ──
    trees = export_trees(out, src, offset, ground, centroids, with_qsm=not args.no_qsm)
    log(f"trees.json: {len(trees)} ({sum(t['valid'] for t in trees)} valid, "
        f"{sum('qsmMesh' in t for t in trees)} QSM meshes)")

    t_seen = np.zeros(len(pos), np.uint16)
    files: dict = {"cloud": "cloud.json", "trees": "trees.json", "dtm": "dtm.glb"}
    samples = export_trajectory(out, src, offset, ground, args.sensor_height)
    if samples is not None:
        files["trajectory"] = "trajectory.json"
        log(f"trajectory.json: {len(samples)} samples, {samples[-1, 0]:.1f} s")
        t_seen = compute_t_seen(pos, samples)
        log(f"tSeen: {np.mean(t_seen < T_SEEN_NEVER):.1%} of points revealed")

    log("synthesising natural colours")
    color = synth_colors(pos, sem, inst, hag, trees, args.seed)
    export_cloud(out, pos, color, sem, inst, hag, t_seen)
    log(f"cloud.bin: {(out / 'cloud.bin').stat().st_size / 1e6:.1f} MB")

    export_dtm(out, dtm_xyz, offset, args.seed, ground_xy_all)

    charts = {}
    for png in sorted((src / "visuals").glob("*.png")):
        shutil.copy(png, out / "media" / png.name)
        charts[png.stem] = f"media/{png.name}"
    files["charts"] = charts

    videos = sorted(src.glob("*.mp4"))
    video = args.video or (videos[0] if videos else None)
    if video and not args.no_video:
        files["video"], files["videoRenditions"] = export_video(out, video, args.force_video)
    camera = export_camera(out, src)
    if camera:
        files["camera"] = camera
    elif args.no_video and (out / "media" / "video").exists():
        shutil.rmtree(out / "media" / "video")

    lat, lon = map(float, args.geo.split(",")) if args.geo else DEFAULT_GEO
    write_json(out / "plot.json", {
        "id": out.name,
        "name": args.name,
        "captureDate": capture_date_from(video, "2026-09-30T16:28:35+05:00"),
        "device": "TimberSense Backpack TS-01",
        "operator": "Field crew A",
        "species": [SPECIES],
        "geo": {"lat": lat, "lon": lon, "boundary": plot_boundary(dtm_xyz[:, :2], offset, lat, lon)},
        "offset": offset.round(4).tolist(),
        "files": files,
        "summary": summary_from(src),
    })

    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    log(f"wrote {out} ({size / 1e6:.1f} MB) in {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()
