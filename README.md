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

Python tooling (data prep) needs `python3` with `numpy` and `Pillow`. `scipy` is optional.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run check` | `tsc` + Biome. **Must pass before every PR.** |
| `npm run lint` | Biome with autofix |
| `npm run sample` | Regenerate `public/data/plots/sample/` from `testdata/fariy_1_test` |

## Plot data

- `public/data/plots/<plotId>/` holds the web-ready plot files in the §5 formats: `plot.json`, `cloud.json`/`cloud.bin`, `trees.json`, `trajectory.json` and `media/`.
- **`sample/`** (300k points) is committed, so every workstream can develop without the raw data.
- Full plots such as `fariy_1_test` are generated locally (WS-A, `tools/prepare_plot.py`) and are git-ignored.
- Raw pipeline output lives in `testdata/` (git-ignored, about 3 GB).

Open the sample viewer at `/projects/kotli-sattian/blocks/ks-b01/plots/sample`.

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

- **Branches:** `ws-<letter>/<topic>`, e.g. `ws-c/dbh-ring`. Keep PRs small, squash-merge into `main`, and rebase daily.
- **Folders:** edit only the folders your workstream owns. Changes to `src/types/`, `viewer/store.ts`, `viewer/PlotDataContext.tsx`, `lib/`, `components/ui/` or `app/` go in a separate **contract PR** that lists the workstreams it affects.
- **Scene frame:** metres, **Z-up**, origin at the plot centre on the ground. Data files are already in this frame.
- **Units:** format every number through `lib/format.ts`. Never hand-format units.
- **Links:** build paths with `routes.*` from `app/routes.ts`.
- **Theme:** use the SylvaSense tokens in `src/index.css` (`bg-brand`, `text-fg-muted`, `bg-surface`, …). Farmevo orange is `text-farmevo` / `bg-farmevo-soft`. The viewer class colours are `--color-class-*`.
- **PRs:** include a screenshot or GIF with every UI PR.
