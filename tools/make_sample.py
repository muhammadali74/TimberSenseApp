#!/usr/bin/env python3
"""
Build the small committed sample plot (public/data/plots/sample) that every workstream develops against.
Same exporter as the full plot (tools/prepare_plot.py), just subsampled to 300k points and without video.

    python3 tools/make_sample.py testdata/fariy_1_test public/data/plots/sample
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prepare_plot import main  # noqa: E402

if __name__ == "__main__":
    src, out, *rest = sys.argv[1:] or ["testdata/fariy_1_test", "public/data/plots/sample"]
    main([src, out, "--points", "300000", "--no-video", "--name", "Plot FR-01 (sample)", *rest])
