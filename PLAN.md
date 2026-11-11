# TimberSense Demo — Build Plan

Browser-based demo portal for Farmevo's autonomous timber cruising product. Its UX follows SylvaSense: a satellite map as the home screen, floating toolbars, project → block → plot drill-down, and a dashboard. Its core is an interactive 3D point-cloud viewer of the cruised plots.

---

## 1. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **React 19 + TypeScript + Vite 7** | Matches SylvaSense exactly, so its components, assets and theme tokens can be reused. |
| Styling/UI | **Tailwind CSS 4** with the SylvaSense `@theme` tokens (brand `#2f9c5a`, Poppins) + Headless UI + lucide icons | Matches the SylvaSense look one to one. |
| Routing | React Router | Gives deep links like `/projects/:id/blocks/:id/plots/:id`. |
| State | Zustand (viewer/UI state) + static JSON (data) | Light. No backend is needed for the demo. |
| 3D | **three.js** via **@react-three/fiber + drei**, with custom GLSL point shaders | Supports custom shaders for hover/selection, EDL, colour modes, flythrough cameras, and GPU picking. |
| Post-processing | Custom **EDL (Eye-Dome Lighting)** pass + optional SSAO / directional light | Gives the CloudCompare/Potree "centred, realistic" look. |
| Map | **OpenLayers** (same as SylvaSense) + Esri World Imagery satellite tiles (no API key) | Supports animated `view.animate` fly-to, clustered markers and polygon layers. It's the same library as SylvaSense. |
| Charts | Recharts | Used for histograms, stand tables and dashboard cards. |
| Data prep | **Python scripts** (`tools/`) using numpy and plyfile | Convert the raw pipeline output into compact web-ready binaries plus JSON. |
| Auth | Fake client-side login (hard-coded default credentials) stored in sessionStorage | — |
| Run | Local only for now: `npm run dev`. Data is served from `public/data/`. | Nothing runs server-side. |

**Point-cloud scale:** the plot cloud has 5.7M points and the full run has 22.5M. The plan is to preprocess to float32 positions centred at the origin, uint8 RGB, uint16 instance and uint8 semantic class, at about 16 B per point. That is about 90 MB raw for 5.7M points, and less after a voxel-downsampled LOD. Clouds over about 8M points (the 22.5M run) get an octree LOD (Potree-style chunks) so the browser streams them progressively.

---

## 2. Data pipeline (`tools/prepare_plot.py`)

Inputs per plot (from `testdata/<plot>/`):
- `visuals/*_semantic_rgb.ply`: xyz, rgba, semantic, instance (5.68M points)
- `trees.csv` / `results.json` / `plot_summary.json`: per-tree DBH, height, volume, biomass, basal area, crown radius, spacing, thinning, QSM status, base and top coordinates
- `forest_pipeline/*_dbh_cylinders.ply`, `*_height_sticks.ply`, `*_dtm.ply`: marker geometry, or regenerated from the CSV
- `trees/<id>/thumbnail.png`, `qsm_mesh.ply`: per-tree card image and optional QSM mesh
- `visuals/*.png`: histograms and agreement charts for the plot report
- video `.mp4` (HEVC 4K): keep a stream-copied **HEVC 4K** file for browsers that can decode it, and transcode to **H.264 4K/1080p/720p** because Chrome cannot reliably play HEVC
- `traj.csv` (t, x, y, z; 10 Hz, 119 s): XY matches the cloud frame. Z is offset by about 19 m (the trajectory's z≈0 while the cloud's ground is at z≈19), so the path is drawn at local DTM height plus sensor height. Heading comes from `traj.tum` (same timestamps, plus SLAM orientation quaternions qx qy qz qw): the lidar body's +X axis is forward. Without `traj.tum`, heading falls back to the walking direction.

Outputs go to `public/data/plots/<plotId>/`. The exact formats are defined in **§5 Contracts**:
- `plot.json`: the manifest for the plot
- `cloud.bin` + `cloud.json`: the point cloud
- `trees.json`: per-tree records. DBH rings, height sticks and crown circles are computed in the viewer from these records, so there is no separate markers file.
- `trajectory.json`: the capture path, with Z corrected and heading derived
- `dtm.glb`: the ground mesh
- `camera.json`: pinhole intrinsics of the undistorted front video (from `hevc_to_mp4.py --undistort`'s `*_intrinsics.json`)
- `media/`: thumbnails, charts, video renditions and QSM meshes

---

## 2b. Decisions (confirmed)
- **Cameras:** one real feed (front). The other three tiles show "Camera offline".
- **Video sync:** the video starts at roughly the same time as the lidar, so `video.currentTime = traj.t - traj.t[0]`. A small manual offset slider is included.
- **RGB mode:** natural-looking synthetic colouring from class plus height above ground (ground: earthy/grass tones, wood: bark browns, foliage: needle greens), with per-point noise. The class-coloured cloud in `visuals/` is the source.
- **Species:** hard-coded as **Chir pine (*Pinus roxburghii*)** for all trees.
- **Real plot:** one for now (`fariy_1_test`, Kotli Sattian, Punjab, Pakistan). More will be added later, so the pipeline is generic per plot.
- **Functional project:** "Kotli Sattian Pine Cruise" (Murree Hills). Dummy projects are in British Columbia and elsewhere in Canada.
- **Branding:** the Farmevo logo comes from the user. Theme, icons and assets are reused from the SylvaSense repo.
- **Hosting:** local.

## 3. Screens & workflow

```
Login ──► Home (Map + Projects) ──► Project ──► Block ──► Plot 3D Viewer
              │                        │           │
              ├─ Dashboard             ├─ Project Summary   ├─ Block Summary
              ├─ Projects list         └─ Blocks table      └─ Plots table
              └─ (stub) Reports, Fleet/Devices, Uploads, Team, Settings, Help
```

### 3.1 Login (`/login`)
- Split layout like SylvaSense: an animated forest panel on the left (rotating stat cards: "DBH accuracy", "Trees measured", a small rotating 3D tree), and the form on the right.
- Farmevo/TimberSense logo, email and password fields, show/hide password, forgot-password link (stub), Google/Microsoft buttons (stub).
- Default credentials pre-hinted, e.g. `demo@farmevo.ai / timbersense`.

### 3.2 App shell
- Full-bleed satellite map as the canvas with floating white pill toolbars (as in SylvaSense):
  - Left: Farmevo logo and the TimberSense wordmark
  - Centre: Dashboard · Search (projects/blocks/plots) · Region selector · "+ New Project" · "Upload Capture"
  - Right: credits/plan badge, notifications, help, user avatar menu (Profile, Settings, Logout), Share
- Collapsible left rail: Map, Projects, Dashboard, Reports, Devices, Team, Settings.

### 3.3 Home map / Projects
- Clustered numbered markers for all projects (dummy ones spread globally, the real one at its GPS location).
- Hover a cluster or marker for a tooltip with block names and status (cruised / pending).
- Click a project: an animated fly-to zooms in, block polygons fade in, and a right-side panel opens with project info, area, # blocks/plots, stocking, and buttons for **Project Summary**, **Cruise Report**, and **View Project**.
- Alternative **Projects list view** (cards/table): name, region, client, area (ha), blocks, plots, status, last capture, progress bar.
- 4 projects: **1 functional** ("Kotli Sattian Pine Cruise", with 6–8 blocks and about 20 plots, 1 of them real for now) and 3 dummies in British Columbia (Southern Interior, Cariboo, Kootenay) with static summaries.

### 3.4 Project page (`/projects/:id`)
- Map with block polygons coloured by status/metric (stems/ha, basal area, volume/ha), and a legend.
- Left sidebar (SylvaSense-style): project metadata, species composition chips, targets (SPH, min DBH), metric toggles, and a list of blocks.
- **Project Summary** tab: KPIs (total area, plots measured, trees measured, mean DBH, mean height, BA/ha, volume/ha, biomass, carbon tCO₂e), DBH class stand table, species mix donut, volume by block bar chart, and Export CSV/PDF buttons (CSV works, PDF is a stub).

### 3.5 Block page (`/projects/:p/blocks/:b`)
- Satellite view zoomed to the block polygon, with plot markers inside (real plots highlighted, dummy plots greyed).
- Hover a plot for a tooltip (plot ID, trees, SPH, BA/ha, capture date).
- Click a plot for a side card with a **3D thumbnail** and an **Open 3D Viewer** button.
- **Block Summary**: the same KPI card style aggregated over the block's plots, plus a per-plot table.

### 3.6 Plot 3D Viewer (`/…/plots/:id`), the core screen
Layout: a top bar (breadcrumbs, plot name, capture date, Share/Export), a left tool panel, the full 3D canvas, a right info sidebar, and a bottom timeline (only when trajectory playback is on).

**Viewer features**
1. **Colour modes:** RGB · Instance (tree ID, distinct palette) · Semantic (ground / wood / foliage) · Height (HAG gradient) · Metric heatmap (DBH/height/volume per tree).
2. **Rendering:** EDL toggle with strength/radius sliders, point size (fixed/adaptive), directional "sun" light with shadow-like shading, background (sky gradient/dark/white), and a ground/DTM mesh toggle.
3. **Navigation:** orbit around the plot centre (centred perspective, like CloudCompare), first-person walk mode (WASD), and reset view, top, and side buttons.
4. **Hover a tree:** the whole instance glows or outlines (shader uniform `hoveredId`), and a small tooltip shows the ID, DBH and height.
5. **Click a tree:** selects it, dims the rest, and shows the **DBH ring** at 1.3 m, the **height stick** from base to top with a label, and the crown radius circle. The camera eases to frame the tree, and the right sidebar fills with tree details.
6. **Right sidebar (tree):** thumbnail, ID, species, DBH (FP & QSM), height, basal area, volume, biomass and carbon, crown radius, stem tilt, nearest neighbour, well-spaced/thinning flag, QSM status, confidence, and a "View QSM model" toggle that shows the mesh.
7. **Right sidebar (no selection):** plot summary KPIs, DBH/height histograms, a searchable/sortable tree list (clicking a row selects the tree in 3D), and the rejected instances list.
8. **Trajectory overlay:** draws the capture path as a glowing line with direction arrows.
9. **Live capture replay:** play/pause/scrub timeline with a sensor rig marker moving along the trajectory and a progressive "trail". Optionally the cloud reveals progressively, as if being captured live. A **camera-feed panel** with 4 tiles (front is live, left/right/back show "offline") stays in sync via timestamps (video `currentTime` ↔ pose timestamp interpolation). Playback speed is 0.5×–4×.
10. **Cinematic flythrough:** presets "Orbit plot", "Walk between trees" (Catmull-Rom spline weaving between tree bases at ~1.7 m eye height) and "Tree-by-tree tour". Letterbox UI, auto-hidden controls, and a record/export option (stub).
11. **Map inset:** a small 2D mini-map with the camera frustum and plot position.
12. **Measure tool (bonus):** point-to-point distance.

### 3.7 Dashboard (`/dashboard`)
SylvaSense "Forest Operation Dashboard" style: headline KPI (plots cruised of total), a KPI strip (projects, blocks, plots, trees measured, area cruised, volume), a capture-activity calendar heatmap, cards for stocking status, species mix, DBH distribution, volume by project, devices/operators, and filter bar plus Export CSV.

### 3.8 Stub screens (look real, minimal function)
Reports list (downloadable PDFs: stubs), Devices/Fleet (TimberSense backpack units, battery, last sync), Upload Capture modal (drag-and-drop with a fake progress → "processing" pipeline stages), Team, Settings, Notifications drawer.

---

## 4. Theme
- **Tokens:** copy the SylvaSense `@theme` block (`src/index.css`) verbatim. That gives brand `#2f9c5a`, brand-soft `#e6f4eb`, surfaces, borders, warning/danger/info, dark-mode overrides, and the `.dashboard-theme` gradient cards.
- **Font:** Poppins for the UI and IBM Plex Mono for numbers in tables and the dashboard.
- **Look:** white floating pill toolbars over full-bleed satellite or 3D canvases, cards with a 12–16 px radius and soft shadow, and `lucide-react` icons. SVG icons come from `sylvasense/src/assets/icons` where they fit.
- **Logo:** the Farmevo logo comes from the user. Until it arrives, use the SylvaSense `app-logo.svg` as a stand-in in `src/assets/brand/`.
- **Viewer colours:** class colours are ground `#89AF46`, wood `#865E3C` and foliage `#63CF00`, the same as the pipeline. The species chip for Chir pine is `#2f9c5a`.

---

## 5. Contracts (frozen in Phase 0; change only via a PR the foundation owner reviews)

Everything a workstream needs from another workstream goes through one of these contracts. Each contract is checked in as TypeScript types in `src/types/`, and Python writes JSON that matches them. Phase 0 also commits a **small sample plot** (`public/data/plots/sample/`, about 300k points) in this exact format. Every UI workstream can start against the sample on day one, before the full data pipeline exists.

### 5.1 Coordinate frame
- Units are metres, the scene is **Z-up** (`camera.up = (0,0,1)`), and positions are float32 in the **plot frame** (`source_xyz - offset`).
- `offset` is the bbox centre in XY and the 5th-percentile ground Z in Z, so the origin is at the plot centre on the ground.
- Every plot-level file (`cloud`, `trees`, `trajectory`, `dtm`) is already in the plot frame. The UI never applies offsets itself.

### 5.2 `plot.json` (manifest) → `src/types/plot.ts`
```ts
interface PlotManifest {
  id: string; name: string; captureDate: string;      // ISO
  device: string; operator: string; species: string[]; // ["Chir pine"]
  geo: { lat: number; lon: number; boundary?: [number, number][] }; // WGS84 lon/lat ring
  offset: [number, number, number];                    // source → plot frame
  files: {
    cloud: string; trees: string; trajectory?: string; dtm?: string;
    video?: { front?: string; left?: string; right?: string; back?: string }; // missing = "offline"
    videoRenditions?: { front?: VideoRendition[]; /* … same cameras */ };   // optional; best first (WS-E)
    // VideoRendition = { src: string; codec: 'hevc' | 'h264'; width: number; height: number }
    camera?: string;                                   // 'camera.json' → CameraIntrinsics (§5.2b)
    charts?: Record<string, string>;                   // e.g. hist_dbh_cm → media/hist_dbh_cm.png
  };
  summary: PlotSummary; // camelCase version of plot_summary.json + carbonT, co2eT
}
```

### 5.2b `camera.json` (front-camera intrinsics) → `src/types/plot.ts` `CameraIntrinsics`
Pinhole intrinsics of the **undistorted** front video, in 0-based pixels. The video was undistorted from the raw fisheye (MATLAB `fisheyeParameters` in `matlab.mat`) by `hevc_to_mp4.py --undistort`, equivalent to MATLAB `undistortFisheyeImage(..., 'OutputView','same')` with ScaleFactor 1, so the principal point is the image centre.
```ts
interface CameraIntrinsics {
  version: 1; model: 'pinhole'; width: number; height: number;   // 3840 × 2160
  fx: number; fy: number; cx: number; cy: number;                // 1889.446, 1889.446, 1919.5, 1079.5
  hfovDeg: number; vfovDeg: number;                              // 90.919, 59.504 (derived)
  source?: {...};                                                // tool, scale factor, calibration file
  fisheye?: { model: 'scaramuzza'; mappingCoefficients; distortionCenter; stretchMatrix; imageSize }; // raw lens, reference only
}
```
The raw lens covers about 125° × 67°, but undistorting to a 3840 × 2160 pinhole at ScaleFactor 1 keeps only the central 90.9° × 59.5°. The 3D view must match the video, so it uses the pinhole values. A smaller ScaleFactor would keep more of the lens and produce a new `camera.json`. Loaded by `lib/loaders.ts` as `PlotData.camera` (null when absent).

### 5.3 `cloud.json` + `cloud.bin` → `src/types/cloud.ts`
`cloud.bin` stores each attribute as its own array, one after another (struct-of-arrays), with every array starting on a 4-byte boundary. `cloud.json` describes the layout:
```ts
interface CloudHeader {
  version: 1; count: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  classes: Record<number, 'ground' | 'wood' | 'leaves'>;
  attributes: Array<{ name: 'position' | 'color' | 'semantic' | 'instance' | 'hag' | 'tSeen';
                      type: 'float32' | 'uint8' | 'uint16'; size: 1 | 3;
                      byteOffset: number; byteLength: number }>;
  lod?: Array<{ file: string; count: number }>;  // later; ignore if absent
}
```
| attribute | type × size | meaning |
|---|---|---|
| position | float32×3 | plot frame |
| color | uint8×3 | synthetic "natural" RGB |
| semantic | uint8 | 0 ground, 1 wood, 2 leaves |
| instance | uint16 | tree id, 0 = none |
| hag | uint16 | height above ground in cm |
| tSeen | uint16 | first time, in 0.1 s steps since the trajectory starts, that the point was within 6 m of the sensor (a visual capture radius). Points never in range get the trajectory end time, so a finished replay shows the whole cloud. 65535 = never (only if there's no trajectory). Drives the "live capture" reveal. |

### 5.4 `trees.json` → `src/types/tree.ts`
```ts
interface Tree {
  id: number; valid: boolean; rejectReason?: string; species: string;
  base: [number, number, number]; top: [number, number, number];  // plot frame
  dbhCm: number | null; dbhCmQsm: number | null; dbhConfidence?: string;
  heightM: number | null; heightMQsm: number | null;
  basalAreaM2: number | null; volumeM3: number | null; biomassKg: number | null;
  carbonKg: number | null; co2eKg: number | null;      // carbon = 0.5 × biomass, CO2e = 3.667 × carbon
  crownRadiusM: number | null; stemTiltDeg: number | null;
  nnDistM: number | null; nnId: number | null; wellSpaced: boolean; thinRemove: boolean;
  qsmStatus: 'ok' | 'partial' | 'no_tree' | 'not_run'; nPoints: number;
  dbhRings?: {center: [number, number, number]; normal: [number, number, number]; radiusM: number}[];
  dbhRingIndex?: number;                                // ring at the measured DBH height
  thumbnail?: string; qsmMesh?: string;                 // relative paths
}
```

`dbhRings` (added during WS-C) reproduces the pipeline's `*_dbh_cylinders.ply`: 5 exact circles 5 cm apart around the fitted stem centre. The stem centre at DBH can differ from `base` by about 10 cm, so DBH overlays must use the rings, not `base`.

### 5.5 `trajectory.json` → `src/types/trajectory.ts`
```ts
interface Trajectory {
  rateHz: number; durationS: number; sensorHeightM: number;
  videoOffsetS: number;                     // default 0: video t = traj t + offset
  yawSource?: 'orientation' | 'velocity';   // absent = 'velocity' (older exports)
  samples: [t: number, x: number, y: number, z: number, yaw: number][]; // t from 0 s, z on DTM + sensor height, yaw in radians CCW from +X (lidar body +X from traj.tum, or walking direction)
}
```

### 5.6 Catalog (projects → blocks → plots) → `src/types/catalog.ts`, data in `src/data/catalog.ts`
```ts
interface Project { id: string; name: string; client: string; region: string; country: string;
  status: 'active' | 'planned' | 'completed'; center: [lon: number, lat: number];
  areaHa: number; lastCapture?: string; targets: { sph: number; minDbhCm: number };
  blocks: Block[]; }
interface Block { id: string; name: string; status: 'cruised' | 'in_progress' | 'pending';
  polygon: [number, number][]; areaHa: number; plots: PlotRef[]; }
interface PlotRef { id: string; name: string; center: [number, number];
  status: 'processed' | 'captured' | 'pending';
  dataPath?: string;            // '/data/plots/fariy_1_test' for real plots only
  summary?: PlotSummary; }      // real plots load it from plot.json; dummy plots carry generated numbers
```
Aggregation helpers (`src/lib/aggregate.ts`) such as `summarizeBlock(block)`, `summarizeProject(project)` and `allPlots()` are part of this contract, so the map, summary and dashboard workstreams all compute the same numbers.

### 5.7 Viewer store → `src/features/viewer/store.ts` (Zustand)
This is the only way viewer workstreams talk to each other. Phase 0 defines every field and action listed here.
```ts
colorMode: 'rgb' | 'instance' | 'semantic' | 'height' | 'metric'; metric: 'dbh' | 'height' | 'volume';
render: { edl: boolean; edlStrength: number; edlRadius: number; pointSize: number;
          sizeMode: 'fixed' | 'adaptive'; background: 'sky' | 'dark' | 'light'; showDtm: boolean; sunAzimuth: number; sunElevation: number };
layers: { markers: boolean; trajectory: boolean; qsm: boolean; labels: boolean };
hoveredTreeId: number | null; selectedTreeId: number | null; dimOthers: boolean;
cameraMode: 'orbit' | 'walk' | 'flythrough' | 'follow';
cameraRequest: { kind: 'focusTree'; id: number } | { kind: 'view'; view: 'reset' | 'top' | 'side' } | null;
playback: { enabled: boolean; t: number; playing: boolean; speed: 0.5 | 1 | 2 | 4; reveal: boolean };
flythrough: { preset: 'orbit' | 'walk' | 'tour' | null; playing: boolean; progress: number };
// actions: setters for each field + selectTree(id), hoverTree(id), requestCamera(req), consumeCameraRequest()
```

### 5.8 Point-material uniforms (Workstream B implements them; others drive them only through the store)
`uColorMode, uMetricTex (lookup from instance to value), uHoveredId, uSelectedId, uDimOthers, uRevealT (-1 = off), uPointSize, uSizeMode`.

### 5.9 Viewer composition (each layer is one file owned by one workstream)
```tsx
<PlotViewer plotId>                  // A0 – loads manifest, cloud, trees, trajectory
  <ViewerCanvas>                     // B
    <PointCloudLayer/>               // B
    <DtmLayer/>                      // B
    <EdlPass/>                       // B
    <TreeMarkersLayer/>              // C
    <TreePicker/>                    // C
    <QsmMeshLayer/>                  // C
    <TrajectoryLayer/> <RigMarker/>  // E
    <CameraController/>              // B (orbit/walk/requests), delegates to F/E in flythrough/follow modes
  </ViewerCanvas>
  <ViewerToolbar/>                   // B (left tool panel; other workstreams add buttons via `toolbarSlots`)
  <ViewerSidebar/>                   // D
  <ReplayTimeline/> <CameraFeeds/>   // E
  <FlythroughControls/>              // F
</PlotViewer>
```

---

## 6. Repository layout & ownership
```
TimberSense_app/
├─ tools/                        # A  – python data prep
├─ public/data/plots/<id>/       # A  – generated (binaries git-ignored; sample/ is committed)
├─ src/
│  ├─ types/                     # P0 – contracts (§5)
│  ├─ data/catalog.ts            # H  – projects/blocks/plots (P0 creates the stub)
│  ├─ lib/                       # P0 – aggregate.ts, format.ts (units), loaders.ts
│  ├─ components/ui/             # P0 – Button, Card, KpiTile, Pill, Sidebar, Tabs, Tooltip, Modal, Badge
│  ├─ app/                       # P0 – router, AuthGuard, Layout; G owns the shell content
│  ├─ features/
│  │  ├─ auth/                   # G
│  │  ├─ shell/                  # G  – top toolbars, left rail, notifications, stubs
│  │  ├─ map/                    # H  – OpenLayers base map, clusters, polygons, panels
│  │  ├─ projects/ blocks/       # H (map pages) + I (summary tabs, in summary/ subfolders)
│  │  ├─ dashboard/              # I
│  │  └─ viewer/
│  │     ├─ store.ts             # P0
│  │     ├─ core/ shaders/       # B
│  │     ├─ trees/               # C
│  │     ├─ sidebar/             # D
│  │     ├─ replay/              # E
│  │     └─ flythrough/          # F
│  └─ assets/
└─ PLAN.md
```
**Rule:** a workstream edits only the folders it owns. Shared files (`types/`, `store.ts`, `lib/`, `components/ui/`, router) change only through small PRs that the foundation owner reviews.

---

## 7. Workstreams

### Phase 0 — Foundation (blocking; 1 engineer, ~1–2 days) — ✅ done
Everything else starts once this is merged.
- Scaffold Vite + React 19 + TS + Tailwind 4 + Biome. Copy the SylvaSense theme tokens and the Poppins font.
- Router with placeholder pages for every route in §3, a fake `AuthGuard`, and a `Layout`.
- All contract types (§5), the viewer store with every field and no-op actions, and `lib/` loaders and aggregation helpers.
- UI kit primitives in `components/ui/`.
- `tools/make_sample.py`: a minimal exporter writing the §5 formats from `fariy_1_test`, downsampled to about 300k points. It uses plain class colours, `tSeen` computed roughly, and trajectory Z corrected with a constant offset. The output is committed to `public/data/plots/sample/`.
- `src/data/catalog.ts` stub: the real project with 1 block and 2 plots (one pointing to `sample`).
- A `PlotViewer` skeleton that loads the sample and renders it with basic `THREE.Points` and OrbitControls, with an empty slot for each layer.
- README with setup, conventions and the branch/PR workflow.

**Done when** `npm run dev` shows a themed app, every route resolves, `/…/plots/sample` renders the sample cloud, and `npm run check` passes.

### After Phase 0, workstreams A–I run in parallel

| WS | Name | Owns | Depends on (contract only) | Size |
|---|---|---|---|---|
| A | Data pipeline | `tools/`, `public/data` | §5.1–5.5 | M |
| B | Viewer rendering core | `viewer/core`, `viewer/shaders` | §5.3, 5.7, 5.8 | L |
| C | Tree interaction & markers | `viewer/trees` | §5.4, 5.7, 5.8 | M |
| D | Viewer sidebar & plot analytics | `viewer/sidebar` | §5.2, 5.4, 5.7 | M |
| E | Trajectory & capture replay | `viewer/replay` | §5.3 (tSeen), 5.5, 5.7 | M |
| F | Cinematic flythrough | `viewer/flythrough` | §5.4, 5.7 | S–M |
| G | Auth, app shell & stub screens | `auth/`, `shell/` | router, UI kit | M |
| H | Maps, catalog & drill-down | `map/`, `projects/`, `blocks/`, `data/catalog.ts` | §5.2, 5.6 | L |
| I | Summaries & dashboard | `*/summary/`, `dashboard/` | §5.6 aggregation | M |

#### A — Data pipeline (Python) — ✅ done (`ws-a/prepare-plot`)
- `tools/prepare_plot.py <input_dir> <plot_id>` writes all of §5 for one plot. It must be idempotent and reusable for future plots.
- **Synthetic natural RGB:**
  - ground: grass/soil mix, varied by slope and noise
  - wood: bark browns, darker near the base, plus vertical streak noise
  - leaves: needle greens, lighter at the top of the crown
  - all classes: slight per-tree hue jitter
- **HAG:** from the DTM, quantised to cm.
- **`tSeen`:** KD-tree query of points against trajectory samples.
- **DTM:** `dtm.glb`, a decimated mesh with vertex colours.
- **`trees.json`:** from `trees.csv`, adding species, carbon and CO2e, and copying thumbnails into `media/`.
- **QSM meshes:** converted to `.glb`.
- **Trajectory:** Z placed on the DTM plus sensor height, smoothed yaw, and resampled to 10 Hz.
- **Video:** `tools/transcode.sh` produces H.264 at 1080p and 720p with `+faststart`, plus a poster frame.
- **Charts:** PNGs copied, with keys added to the manifest.
- **Later:** a `--lod` octree for clouds over 8M points.
- **Done when** `fariy_1_test` is exported to `public/data/plots/fariy_1_test/` and a schema check script (`tools/validate_plot.py`) passes.
- **Delivered:**
  - `tools/prepare_plot.py`: full export of `fariy_1_test` in about 10 s (5.68M points, 125 MB `cloud.bin`)
  - `tools/make_sample.py`: now a wrapper around it (300k points, no video)
  - `tools/transcode.sh`: H.264 at 1080p (134 MB) and 720p (67 MB) with 1 s keyframes, plus a poster frame. The manifest points at the 720p file.
  - `tools/validate_plot.py`: checks plots against the §5 contracts
- **Notes for other workstreams:**
  - **HAG** comes from the pipeline's `*_hag.ply`.
  - **DTM:** `dtm.glb` is a Delaunay mesh of `*_dtm_complete.ply`, with `COLOR_0` and `NORMAL` attributes.
  - **QSM meshes:** `media/qsm/<id>.glb` files in the plot frame, for 28 trees. Tree 278 has no QSM.
  - **Rejected instances:** placed at their point centroid on the DTM, so all 40 trees appear in `trees.json`.
  - **`plot.json` boundary:** `geo.boundary` is the convex hull of the DTM, assuming plot X = east and Y = north. There's no GPS heading yet.
  - **WS-B:** vertex colours are **sRGB**. Convert them to linear in the shader, or the cloud looks washed out.
  - **WS-E:** the video is variable frame rate (about 14.5 fps average, 120.4 s) and was re-encoded at a constant 15 fps. Duration matches `traj.csv` (119.3 s), so `videoOffsetS = 0` is a good default.
  - **Not yet done:** `--lod` octree for clouds over 8M points. Not needed until a larger plot arrives.

#### B — Viewer rendering core — ✅ done (`ws-b/rendering`)
- Binary loader using a Web Worker and transferable buffers, with a `BufferGeometry` per attribute.
- Point `ShaderMaterial` with all colour modes and all §5.8 uniforms:
  - highlight: brighten and outline-tint the hovered or selected instance, and desaturate and darken the others when `dimOthers` is on
  - reveal: discard points with `tSeen > uRevealT`
- **EDL** post-pass (Potree-style, strength and radius settings), adaptive point size, sky-gradient background, sun shading from normal-less depth gradients, and a DTM layer.
- `CameraController`: orbit around the plot centre with damping, walk mode (WASD, eye height 1.7 m, terrain-following via the DTM), reset/top/side views, and `cameraRequest` handling (smooth focus on a tree).
- Left `ViewerToolbar`: colour mode, render settings popover, layer toggles, camera modes, and slots for the other workstreams.
- **Done when** the full 5.7M-point plot renders at ≥ 45 fps on a mid-range GPU, with EDL on and every colour mode working against the sample.
- **Delivered:**
  - **Point shader** (`shaders/points.ts`) supporting every colour mode and §5.8 uniform:
    - Natural, Tree ID, Class, Height above ground, and Tree metric (DBH, height or volume)
    - hover: orange tint plus larger points
    - selection: warm tint, with the other trees dimmed
    - live-capture reveal with a cyan glow on the scan front
    - round, adaptive-size points
  - **Composite pass** (`EdlPass`): renders the scene into a float target with a depth texture, then applies Potree-style EDL, soft sun shading from screen-space normals, the sky/dark/light background gradient, distance haze, and sRGB output.
  - **Camera** (`CameraController`): orbit with damping; double-click a point to re-centre the pivot (CloudCompare-style); reset, top and side views; eased focus on a tree. Walk mode (`WalkControls`): WASD, drag to look, Shift to run, Esc back to orbit, following the terrain at 1.7 m eye height.
  - **Ground mesh** (`DtmLayer`), plus hemisphere and sun lights.
  - **Toolbar:** colour-mode popover, rendering popover (EDL, point size, sun, DTM, background), camera modes and view presets. Also a colour legend (bottom-left) and a walk-mode hint.
- **Shared helpers other workstreams can import (read-only):**
  - `core/ground.ts` (`useGround().heightAt(x, y)`)
  - `core/ToolbarButton.tsx` (`ToolbarButton`, `ToolbarDivider`)
  - `core/controls.tsx` (`Slider`, `Switch`, `Segmented`, `Field`)
  - `core/colors.ts`, `EYE_HEIGHT_M`, `homePose()`, `sunDirectionWorld()`
- **Notes:**
  - **Colour pipeline:** everything renders linear into the EDL target. Custom materials should output linear colour.
  - **EDL:** background neighbours give a small fixed response instead of Potree's "infinitely far" rule, which turned sparse clouds black.
  - **Debugging:** `?stats` shows an FPS meter, and `window.__viewerStore` is available in dev builds only.
  - **Performance:** fps is only verified in headless software rendering. Confirm ≥ 45 fps on a real GPU with `?stats`.
  - **Not done:** a Web Worker loader isn't needed, because the streaming `fetch` already creates zero-copy views. GPU id-picking is left for WS-C if CPU picking proves slow.

#### C — Tree interaction & markers — ✅ done (`ws-c/tree-interaction`)
- **Picking:** CPU raycast against per-tree proxy cylinders built from `trees.json` (base, top and crown radius), refined by the closest instance point. Optionally upgrade to GPU id-picking later. This keeps C independent of B's shader.
- On hover, `hoverTree(id)` plus a small floating tooltip (ID, DBH, height). On click, `selectTree(id)` plus `requestCamera({kind:'focusTree'})`. Esc clears the selection.
- `TreeMarkersLayer` for the selected tree:
  - DBH ring at 1.3 m (torus, labelled "DBH 36.4 cm")
  - height stick from base to top with tick marks every 1 m and a "5.5 m" label
  - crown-radius circle on the ground
  - base pin
- Optional labels for all trees (ID and DBH billboards) and a thinning overlay (red rings on trees flagged for removal, plus spacing-conflict lines).
- `QsmMeshLayer`: loads the selected tree's `.glb` when `layers.qsm` is on.
- **Done when** hover, click and Esc work on the sample, and markers match the CSV values.
- **Delivered:**
  - **Picking** (`trees/pick.ts`): a ray test against per-tree stem and crown capsules. Rejected instances are pickable too, and their tooltip shows the reject reason.
  - **Hover:** a tooltip anchored at the tree top. It reads the store's `hoveredTreeId`, so hovering a sidebar row (WS-D) shows it too.
  - **Click:** selects the tree, then focuses the camera after 260 ms. A double-click cancels the focus, so the WS-B pivot re-centre still works.
  - **Deselect:** click empty space or press Esc.
  - **Selected-tree markers:**
    - DBH rings: the exact pipeline fit from `tree.dbhRings` (5 rings, 5 cm apart), drawn as dotted rings with 36 dots each. The ring at the measured DBH height is cyan with a matching label, and the rest are white. Dots are sized in metres with a 4 px minimum, and the far side of the stem is faded.
    - height stick beside the stem, with 1 m ticks, end caps, a dashed link to the tree top and a label
    - crown circle that follows the terrain
    - base pin
    - The pin, crown circle and stick are centred on the fitted stem axis projected to the ground, not on `base`, which can be about 10 cm off.
  - **Overlays:**
    - tree labels (ID + DBH)
    - thinning plan: red rings plus "✕ id" labels on `thinRemove` trees, and amber links between trees closer than 2 m. Its toggle is local state in `trees/treesUi.ts`, not part of the store contract.
    - QSM `.glb` of the selected tree, drawn as a semi-transparent overlay
- **Verified in the browser:** a mouse sweep finds 35 trees, clicking selects the right tree, Esc and clicking empty space both deselect, and there are no console errors.

#### D — Viewer sidebar & plot analytics
- **No selection:** plot header (name, date, device, species chip), KPI grid (SPH, mean/QMD DBH, mean/max height, BA/ha, volume/ha, biomass, CO2e), DBH and height histograms (Recharts, from `trees.json`), a sortable and searchable tree table where clicking a row calls `selectTree` and `requestCamera`, and a rejected-instances accordion.
- **Tree selected:** thumbnail, species, measurements (FP vs QSM side by side), basal area, volume, biomass, carbon, crown, tilt, nearest neighbour, well-spaced/thin flags, QSM status badge, "View QSM model" toggle, and previous/next tree buttons.
- Export the tree table as CSV.
- **Done when** the sidebar works against the sample using only the store and `trees.json`.

#### E — Trajectory & capture replay
- `TrajectoryLayer`: a glowing tube or line with direction arrows, coloured by time, with start and end markers.
- `RigMarker`: a backpack/sensor glyph with a heading cone and a lidar range ring (15 m).
- `ReplayTimeline`: play/pause, scrubbing, speed (0.5–4×), the current time and an elapsed trail.
- **Reveal mode:** sets `playback.reveal`, and the store passes `uRevealT` on to B's shader.
- **First-person replay ("walk the capture"):** the headline feature. During replay the 3D camera walks through the point cloud exactly as the operator walked in the video, so the cloud and the front-camera footage move together.
  - **Pose:** position comes from `trajectory.samples` interpolated at the current time (Catmull-Rom, so motion is smooth at 60 fps between the 10 Hz samples). Height is the trajectory Z (DTM + sensor height) plus a calibration offset, so it follows the terrain like B's walk mode.
  - **Heading:** from the SLAM orientation in `traj.tum` (`yawSource: 'orientation'`): the heading of the lidar body's +X axis, which is the forward direction (on `fariy_1_test` it stays within 30° of the walking direction 99.6% of the time, mean offset −3.7°). It's lightly smoothed (~0.15 s) to take out footstep sway, so the view turns when the operator turns, including turning on the spot. Exports without `traj.tum` fall back to the walking direction, smoothed over ~0.6 s and weighted by speed. Pitch and roll are in `traj.tum` too but are not used yet; tilt is still the calibration slider.
  - **Matching the footage:** the projection is built directly from the video's intrinsics in `camera.json` (fx, fy, cx, cy; §5.2b). The video frame is fitted inside the canvas, so horizontal **and** vertical FOV both match without stretching. A "video frame" outline shows where the video's edges fall, since the canvas is a different shape than 16:9.
  - **Calibration panel:** time offset (`videoOffsetS` default from the trajectory, ±1 frame nudges), heading offset, camera tilt, **horizontal FOV and vertical FOV** (default from `camera.json`, each resettable to it) and eye height. Values are saved per plot in the browser. Plots without `camera.json` fall back to 90° × 59°.
  - **Looking around:** while paused, drag to look around from the current spot. Pressing play eases the view back to the walking direction.
  - Runs as `cameraMode: 'follow'`. B's `CameraController` already hands over control in this mode. The rig marker hides in first person.
- **Bird's-eye path overview** (toolbar button "Path overview"): switches to a top-down orbit view of the whole plot with the capture path drawn **over** the point cloud, so the canopy can't hide it. The path has the same styling as in the replay walk: coloured by time (teal → green → yellow → orange, hue-interpolated so the middle doesn't go muddy), a dark casing for contrast, direction arrows, and Start/End pins, all larger in this view. The mouse rotates (drag), pans (right-drag) and zooms (scroll) using B's OrbitControls. A panel shows path length, duration and the time-colour legend, plus a "back to top-down" button. It works with or without a replay: during replay the rig, the walked trail and the dashed path ahead are visible from above while the video keeps playing. Entering first person or walk mode closes it.
- **Clock and sync:** while a front video is playing, **the video is the master clock**. `requestVideoFrameCallback` gives the time of the frame on screen, and the camera time is extrapolated between frames (≤ 1 frame of error). While scrubbing or paused, the timeline is master and seeks the video. Without a video (e.g. the sample), a timeline clock drives everything. Speed 0.5–4× maps to `video.playbackRate`.
- **4K video in the browser:** the front camera is played at up to 3840×2160.
  - The player takes the renditions listed in `files.videoRenditions.front` (§5.2) and picks the best one the browser can decode: the original **4K HEVC** (`hvc1`, stream-copied, no quality loss) where the GPU and browser support it (`MediaSource.isTypeSupported` / `canPlayType`), otherwise **4K H.264**, then 1080p and 720p.
  - A quality menu (Auto / 4K / 1080p / 720p) overrides it. Auto steps down if 4K drops frames (`getVideoPlaybackQuality`).
  - Falls back to `files.video.front` when no renditions are listed.
- **`CameraFeeds` as picture-in-picture:** in first-person mode the 3D view is full-screen and the front video floats as a PiP window. The window can be resized (S / M / L), snapped to any corner, and expanded to fill the viewer. A camera switcher (Front / Left / Right / Back) shows "Camera offline" for the missing cameras. Outside first-person mode the same panel shows as a smaller tile.
- **Done when:**
  - playing the sample shows the rig moving, the trail growing and the cloud revealing
  - in first person on `fariy_1_test` the 3D walk visibly matches the 4K front video (turns and stops line up after calibration)
  - 4K plays smoothly in Chrome via either HEVC or H.264.
- **Data (small change to A's tools):**
  - `tools/transcode.sh` adds a stream-copied HEVC 4K file (`front_2160_hevc.mp4`, `+faststart`) and a **4K H.264** encode (`front_2160.mp4`), and `prepare_plot.py` lists all renditions in `files.videoRenditions`.
  - `prepare_plot.py` turns the video's `*_intrinsics.json` (written by `hevc_to_mp4.py --undistort`; copy it next to the video in the source folder) into `camera.json`, with the raw fisheye model read from the `.mat` it references. `validate_plot.py` checks it.

#### F — Cinematic flythrough
- Path generators from `trees.json` and the plot bbox:
  - **Orbit plot:** a rising helix around the plot
  - **Walk between trees:** greedy nearest-neighbour route over tree bases, offset sideways to pass between stems, as a Catmull-Rom curve at 1.7 m with look-ahead
  - **Tree tour:** pause at each of the top-N trees with an info card overlay
- Easing, constant-speed parameterisation, and collision clearance of ≥ 0.6 m from stems.
- Letterbox bars, auto-hiding UI, play/pause, progress, exit with Esc. "Record video" via `MediaRecorder` on the canvas is a nice-to-have.
- Drives the camera only through `cameraMode: 'flythrough'` and its own controller component, which `CameraController` hands control to.
- **Done when** all 3 presets run smoothly on the sample.

#### G — Auth, app shell & stub screens — ✅ done (`ws-g/shell`)
- Login (§3.1) with an animated left panel and default credentials `demo@farmevo.ai` / `timbersense`, plus logout.
- Shell (§3.2): floating top toolbars, a working global search over the catalog (results navigate to project, block or plot), region selector, user menu, notifications drawer (mock items), and a collapsible left rail.
- **Stub screens:**
  - Reports list with mock PDFs
  - Devices/Fleet: TimberSense units with battery, storage and last sync
  - Team
  - Settings: profile, units (metric/imperial) and theme (light/dark)
  - Help
  - Upload Capture modal: drag-and-drop with fake upload progress, then the pipeline stages (Uploading → SLAM → Segmentation → Tree metrics → Ready)
- **Done when** every nav item lands on a polished screen and nothing is a dead link.
- **Delivered:**
  - **Login:** SylvaSense split layout. The auto-scrolling feature cards use real FR-01 numbers. There's a wrong-password error, plus SSO and forgot-password modals that explain the demo account.
  - **App shell** (`features/shell/AppShell.tsx`):
    - map routes opt into a floating header with `handle: {chrome: 'overlay'}` in `app/router.tsx`; every other route gets the same controls in a solid bar
    - header controls: Dashboard; global search over the catalog (press `/`, arrow keys, Enter); region selector; Upload capture; credits pill; modules launcher; notifications bell with an unread badge; profile menu (units, theme, sign out); Share
  - **Notifications drawer**, **share dialog** (copying the link works) and the **upload-capture flow**: drop zone or device import → upload progress → 7 pipeline stages → "Open in 3D viewer", which also posts a notification.
  - **Placeholder screens:** Reports (filters, downloads), Devices (fleet cards, sensors), Team (invite modal), Settings (units and theme work), Help (quick start, viewer shortcuts, FAQ).
- **Shared bits other workstreams can use:**
  - `useShell().region` (WS-H filters or flies the map with it) and `useShell().units`
  - `toast(message)` from `features/shell/toast.tsx` for stubbed actions
  - `PageLayout` from `features/shell/stubs/PageLayout.tsx`
- **Deviation from §3.2:** there's no collapsible left rail. Following SylvaSense, every section is reachable from the header's modules launcher and profile menu, so map and 3D pages keep the full width.
- **Contract touches:**
  - `app/router.tsx`: `handle.chrome` on the home, project and block routes
  - `viewer/usePlotLoader.ts`: keeps the most recently loaded plot in memory, so re-mounting the page after a units change is instant
  - `index.css`: dark-mode values for the Farmevo orange tokens

#### H — Maps, catalog & drill-down — ✅ done (`ws-h/maps`, branched from `ws-g/shell`)
- **Catalog data:** the full `catalog.ts`.
  - "Kotli Sattian Pine Cruise" (Murree Hills, Punjab, Pakistan, around 33.81° N, 73.52° E; confirm the plot's GPS): 6–8 block polygons and about 20 plots, with `fariy_1_test` as the real one and the rest generated with plausible Chir pine numbers.
  - 3 BC dummy projects (Southern Interior, Cariboo, Kootenay): 4–10 blocks each, with blocks and plots generated from a seeded random generator.
- **OpenLayers base map:** Esri World Imagery plus a labels overlay, with SylvaSense-style controls.
- **Home map:** clustered project markers, hover tooltip, click → `view.animate` fly-to, block polygons fade in, and the right-side project panel (§3.3). Also a projects list/table view toggle.
- **Project page (§3.4):** metric-coloured block polygons with a legend, left sidebar, and block list.
- **Block page (§3.5):** plot markers (real plots highlighted), hover tooltip, and a side card with the plot thumbnail and "Open 3D Viewer".
- Breadcrumb component shared with the viewer top bar.
- **Done when** you can click from the world view → Kotli Sattian → block → plot → viewer, with animated transitions.
- **Delivered:**
  - **Catalog** (`src/data/catalog.ts` + `generate.ts`, all seeded and deterministic):
    - Kotli Sattian: 7 blocks, 35.5 ha, 128 plots on a 50 m systematic grid. KS-B01 holds the real FR-01 plot and the 300k quick-preview plot.
    - Okanagan, Cariboo and Kootenay: 15 blocks, 139 plots on a 100 m grid, with species-specific stand profiles. Centres are placed on forested ground with cutblocks.
  - **Map:** OpenLayers with Esri World Imagery plus a boundaries and places layer (`features/map/olBase.ts`), and shared styles, controls, hover cards and breadcrumbs.
  - **Home:**
    - numbered block clusters that become status-coloured, labelled polygons at zoom 12+
    - hover tooltips (status counts, block names); click to select a project or zoom into a cluster
    - left projects list filtered by the header region (selecting a region flies the map there)
    - right project panel (area, stocking vs target, BA, volume, CO₂e, progress, species, Project summary / Cruise report / Export KML / View project); `?project=<id>` deep-links the selection
  - **Project page:**
    - block polygons coloured by status, stems/ha, basal area, volume or progress, with a legend
    - sidebar with targets, species and a block list linked to the map by hover
    - plot dots at zoom 15+; hover tooltip with block figures; click opens the block
  - **Block page:**
    - yellow block outline (SylvaSense style), true-size plot circles plus numbered markers; real 3D plots in Farmevo orange
    - sidebar with stocking status vs target, targets, species, figures and the plot list
    - plot card with a preview image (camera poster frame), figures and **Open 3D viewer**
  - **`/projects`:** list view with status filter and search.
  - **Summary slots for WS-I:** `projects/summary/ProjectSummary.tsx` and `blocks/summary/BlockSummary.tsx` are placeholders. They're rendered in a `SummaryOverlay` over the map when `?tab=summary` is set.
- **Merge order:** H was branched from `ws-g/shell`, because it uses the shell's region store, toasts and `PageLayout`. Merge G into `dev` before H.

#### I — Summaries & dashboard — ✅ done (`ws-i/summaries`, branched from `ws-h/maps`)
- **Project Summary and Block Summary tabs:** KPI cards, DBH-class stand table (5 cm classes), species donut, volume/BA by block, a per-plot table, and Export CSV (working) and PDF (stub, or `jspdf` if time allows).
- **Dashboard (§3.7):** in `.dashboard-theme` style, with headline KPI, KPI strip, capture-activity calendar heatmap, stocking status, species mix, DBH distribution, volume by project, operators/devices, filter bar, and Export CSV.
- Uses only `lib/aggregate.ts` and the catalog, never per-plot files, except that real plots get their `summary` merged in by the loader.
- **Done when** the numbers agree with the plot sidebar for the real plot, and all cards render for every project.
- **Delivered:**
  - **Shared library** (`features/dashboard/lib`):
    - validated chart palettes (`palette.ts`, details below)
    - stand-table builder (`standTable.ts`): 5 cm DBH classes; real plots use `trees.json`, demo plots a seeded sample from their summary; volume is allocated by basal-area share
    - species shares, stocking classes, real-tree loader, CSV download
  - **Shared components:** `ChartCard`, `TooltipBox`, `BarList` (HTML bars with hover tooltips), `StandTableView` (chart or table), `SpeciesDonut`, `CalendarHeatmap`, `StockingBreakdown`, `SummaryHeader`.
  - **Project summary:**
    - KPIs (area, plots, stocking vs target, basal area, volume, CO₂e) and the stand table
    - species mix and stocking status by block
    - volume by block (click opens the block) and a block table
    - CSV export of blocks and of the stand table; PDF is a stub
  - **Block summary:** KPIs, stand table, stems/ha by plot against a dashed target line, species mix, and a plot table with 3D links. CSV export.
  - **Dashboard:**
    - hero card (plots processed out of the plan), KPI strip, and a filter row (region shared with the header, project status, search, reset)
    - charts: capture-activity calendar with hover tooltips, plot pipeline, stocking status, species mix, volume by project, DBH distribution, device fleet
    - recent captures, with real 3D plots first
    - CSV export of every block
- **Palette check:** the categorical order passes the dataviz validator in light mode (against #ffffff) and dark mode (against #16261d). The dark green was stepped to #34ad5f to stay inside the lightness band. Amber is below 3:1 contrast on white, so amber marks always carry visible labels.
- **Catalog fix:** the FR-01 quick-preview plot no longer has a summary, so it doesn't double-count FR-01 in block and project statistics.
- **Verified:** FR-01's row in the block summary (29 trees, 641/ha, 30.1 cm, 5.4 m, 48.5 m²/ha, 133 m³/ha) matches the viewer sidebar, and the CSV download works.

---

## 8. Integration milestones

```
Day:        1-2        3 ─────────────────────────────── 10 ──────────── 13 ───── 15
P0  ███████
A          ████████████████ (fariy_1_test full export by ~day 6)
B          ████████████████████████████
C          ███████████████████
D          ███████████████
E               ████████████████████  (needs A's tSeen/trajectory for real data; sample until then)
F                   ██████████████
G          ███████████████
H          ██████████████████████████
I               ████████████████████
                                  M1 ▲          M2 ▲          M3 ▲     M4 ▲
```
- **M1 — Viewer alpha (~day 6):** the real plot from A rendered by B. Pick, markers and sidebar (C, D) work.
- **M2 — Drill-down (~day 9):** login (G) → map (H) → block → viewer, with summaries (I) reachable.
- **M3 — Wow features (~day 12):** replay with the camera feed (E), flythrough (F), and the dashboard (I).
- **M4 — Demo-ready (~day 15):** polish pass, perf check, demo script rehearsed, and the Farmevo logo swapped in.

**Staffing suggestions:**
- **2 engineers:** {P0, B, C, E, F} and {A, D, G, H, I}
- **3 engineers:** {P0, B, C}, {A, E, F, D} and {G, H, I}
- **4+ engineers:** one or two workstreams each, with the P0 owner acting as integrator and contract owner

---

## 9. Working conventions
- **Branches:** `ws-<letter>/<short-topic>` (e.g. `ws-b/edl-pass`), branched from **`dev`**. Keep PRs small (≤ ~400 lines) and squash-merge into `dev`. `main` only receives tested milestone merges from `dev` (M1–M4).
- **Rebasing:** rebase on `dev` daily. `dev` and `main` must always build and run.
- **Contracts:** a change to `src/types/`, `store.ts`, `lib/` or `components/ui/` needs its own PR, a note in the PR body naming the affected workstreams, and a review by the foundation owner.
- **Sample-first:** each workstream develops against `public/data/plots/sample/` and must also work on `fariy_1_test` before its milestone.
- **Quality gate:** `npm run check` (tsc + Biome) must pass. Every UI PR includes a screenshot or GIF.
- **Units and formatting:** all formatting goes through `lib/format.ts` (`fmtDbh`, `fmtHeight`, `fmtArea`, `fmtVolume`), so a metric/imperial switch works everywhere.
- **Large files:** never commit raw data or binaries outside `public/data/plots/sample/`. Real exports are regenerated locally with `tools/prepare_plot.py`.
