# TimberSense — Farmevo timber cruising demo

Browser demo portal for Farmevo's autonomous timber cruising product. It has a SylvaSense-style map and project drill-down, plus an interactive 3D point-cloud viewer with per-tree DBH, height, volume and carbon.

**Plan, screens, contracts and workstreams: [`PLAN.md`](PLAN.md). Read §5 (Contracts) and §7 (your workstream) before starting.**

## Setup

```bash
# Node 22 (via nvm)
nvm install 22 && nvm use 22
npm install
npm run dev            # http://localhost:5173
```

Log in with **`demo@farmevo.ai` / `timbersense`**.

Python tooling (data prep) needs `python3` with `numpy`, `scipy` and `Pillow`, plus `ffmpeg` for video.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run check` | `tsc` + Biome. **Must pass before every PR.** |
| `npm run lint` | Biome with autofix |
| `npm run plot:export` | Full export of `testdata/fariy_1_test` → `public/data/plots/fariy_1_test/` (~10 s, plus ~2 min the first time for video) |
| `npm run sample` | Regenerate the committed 300k-point `public/data/plots/sample/` |
| `npm run plot:validate` | Check every plot in `public/data/plots/` against the §5 contracts |

## Plot data

- `public/data/plots/<plotId>/` holds the web-ready plot files in the §5 formats: `plot.json`, `cloud.json`/`cloud.bin`, `trees.json`, `trajectory.json` and `media/`.
- **`sample/`** (300k points) is committed, so every workstream can develop without the raw data.
- Full plots such as `fariy_1_test` are generated locally with `npm run plot:export` and are git-ignored (about 1.7 GB including the 4K video renditions).
- New plots: `python3 tools/prepare_plot.py <pipeline_output_dir> public/data/plots/<id> --name "…" --geo lat,lon`, then add a `PlotRef` with `dataPath: '/data/plots/<id>'` to `src/data/catalog.ts`.
- Raw pipeline output lives in `testdata/` (git-ignored, about 3 GB). See [Test data](#test-data) for where to download it.

Open the sample viewer at `/projects/kotli-sattian/blocks/ks-b01/plots/sample`.

## Test data

The full test plot (`fariy_1_test`) is too large for git. Download it from Google Drive:

**https://drive.google.com/drive/folders/1KdaIFkWjldTC48Mgc5zDRw7Yb-nrFTDk?usp=sharing**

Put it where its contents belong. The folder name `fariy_1_test` (sic) must be kept exactly, because the catalog and scripts use it.

| If the download contains… | Put it at | Then |
|---|---|---|
| raw pipeline output (`visuals/`, `forest_pipeline/`, `trees.csv`, `traj.tum`, the `.mp4`, `*_intrinsics.json`) | `testdata/fariy_1_test/` | `npm run plot:export`, then `npm run plot:validate` |
| a ready web export (`plot.json`, `cloud.bin`, `trees.json`, `media/video/`) | `public/data/plots/fariy_1_test/` | `npm run plot:validate` (no export needed) |

Then run `npm run dev` and open `/projects/kotli-sattian/blocks/ks-b01/plots/fariy_1_test`.

Notes:
- `traj.tum` in the test data is already shifted into the point cloud's frame (the segmentation pipeline moves the map by (−0.836, −2.372, +20.665) m). `traj_backup.tum` is the original SLAM-frame file. The exporter reads path positions and heading from `traj.tum`, so a plot from the same pipeline needs the same correction before export, or the capture path runs through the trees.
- The first export transcodes the video (about 2 min with `ffmpeg`). Later exports reuse the renditions in `media/video/`.
- Without the download, everything still works on the committed `sample/` plot.

## Where things live

```
src/
├─ types/              contracts (§5): plot, cloud, tree, trajectory, catalog
├─ data/catalog.ts     hard-coded projects → blocks → plots          (WS-H)
├─ lib/                loaders, aggregate (cruise stats), format (units), cn
├─ components/ui/      Button, Card, KpiTile, Pill, Badge, Sidebar, Tabs, Tooltip, Modal, Spinner, Logo
├─ app/                router, routes (path builders), session (fake auth), AuthGuard, Layout
└─ features/
   ├─ auth/ shell/                                                   (WS-G)
   ├─ map/ projects/ blocks/                                         (WS-H; summary tabs WS-I)
   ├─ dashboard/                                                     (WS-I)
   └─ viewer/
      ├─ store.ts            viewer state: the only channel between viewer workstreams
      ├─ PlotDataContext.tsx usePlotData(): manifest, cloud, trees, trajectory
      ├─ PlotViewer.tsx      composition of all layers (§5.9)
      ├─ core/ shaders/                                              (WS-B)
      ├─ trees/                                                      (WS-C)
      ├─ sidebar/                                                    (WS-D)
      ├─ replay/                                                     (WS-E)
      └─ flythrough/                                                 (WS-F)
```

Every viewer layer and toolbar slot already exists as an empty component in its owner's folder. Fill in your own files. You shouldn't need to touch `PlotViewer.tsx` or `ViewerToolbar.tsx`.

## Conventions (full list in PLAN.md §9)

- **Branches:** `ws-<letter>/<topic>` from `dev`, e.g. `ws-c/dbh-ring`. Keep PRs small, squash-merge into **`dev`**, and rebase on `dev` daily. `main` only gets milestone merges from `dev`.
- **Folders:** edit only the folders your workstream owns. Changes to `src/types/`, `viewer/store.ts`, `viewer/PlotDataContext.tsx`, `lib/`, `components/ui/` or `app/` go in a separate **contract PR** that lists the workstreams it affects.
- **Scene frame:** metres, **Z-up**, origin at the plot centre on the ground. Data files are already in this frame.
- **Units:** format every number through `lib/format.ts`. Never hand-format units.
- **Links:** build paths with `routes.*` from `app/routes.ts`.
- **Theme:** use the SylvaSense tokens in `src/index.css` (`bg-brand`, `text-fg-muted`, `bg-surface`, …). Farmevo orange is `text-farmevo` / `bg-farmevo-soft`. The viewer class colours are `--color-class-*`.
- **PRs:** include a screenshot or GIF with every UI PR.
