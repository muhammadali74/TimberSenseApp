/** WS-B. Core viewer tools: colour mode, render settings, camera mode, view presets. */
import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react';
import {
  Check,
  Footprints,
  Map as MapIcon,
  Palette,
  Rotate3d,
  RotateCcw,
  SlidersHorizontal,
  TreePine,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';
import {type ColorMode, type MetricKey, type RenderSettings, useViewerStore} from '../store';
import {BACKGROUNDS, CLASS_COLORS, cssGradient, HEIGHT_RAMP, METRIC_RAMP} from './colors';
import {Field, Segmented, Slider, Switch} from './controls';
import {ToolbarButton, ToolbarDivider} from './ToolbarButton';

const COLOR_MODES: {id: ColorMode; label: string; hint: string; swatch: string}[] = [
  {
    id: 'rgb',
    label: 'Natural',
    hint: 'Realistic colour',
    swatch: 'linear-gradient(135deg, #7d9a4c 0%, #8a6a52 50%, #46703a 100%)',
  },
  {
    id: 'instance',
    label: 'Tree ID',
    hint: 'A unique colour per tree',
    swatch: 'conic-gradient(#e0574f, #e6b74a, #64c46e, #4aa8d8, #8c6ad8, #e0574f)',
  },
  {
    id: 'semantic',
    label: 'Class',
    hint: 'Ground · wood · foliage',
    swatch: cssGradient([CLASS_COLORS.ground, CLASS_COLORS.wood, CLASS_COLORS.leaves], '135deg'),
  },
  {id: 'height', label: 'Height', hint: 'Height above ground', swatch: cssGradient(HEIGHT_RAMP, 'to top')},
  {
    id: 'metric',
    label: 'Tree metric',
    hint: 'Trees coloured by DBH / height / volume',
    swatch: cssGradient(METRIC_RAMP, 'to top'),
  },
];

function ToolPopover({
  label,
  icon,
  active,
  width = 'w-64',
  children,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  width?: string;
  children: ReactNode;
}) {
  return (
    <Popover className="relative">
      <PopoverButton as={ToolbarButton} label={label} active={active}>
        {icon}
      </PopoverButton>
      <PopoverPanel
        anchor={{to: 'right start', gap: 12}}
        className={cn('glass-panel z-30 rounded-xl p-3 text-sm shadow-xl', width)}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</div>
        {children}
      </PopoverPanel>
    </Popover>
  );
}

function ColorModePanel() {
  const colorMode = useViewerStore((s) => s.colorMode);
  const metric = useViewerStore((s) => s.metric);
  const setColorMode = useViewerStore((s) => s.setColorMode);
  const setMetric = useViewerStore((s) => s.setMetric);
  return (
    <div className="space-y-1">
      {COLOR_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setColorMode(m.id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer',
            colorMode === m.id ? 'bg-brand-soft' : 'hover:bg-surface-hover',
          )}
        >
          <span className="h-7 w-7 shrink-0 rounded-md border border-black/10" style={{background: m.swatch}} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-fg">{m.label}</span>
            <span className="block truncate text-[11px] text-fg-muted">{m.hint}</span>
          </span>
          {colorMode === m.id && <Check size={14} className="text-brand" />}
        </button>
      ))}
      {colorMode === 'metric' && (
        <div className="pt-2">
          <Segmented<MetricKey>
            value={metric}
            onChange={setMetric}
            options={[
              {id: 'dbh', label: 'DBH'},
              {id: 'height', label: 'Height'},
              {id: 'volume', label: 'Volume'},
            ]}
          />
        </div>
      )}
    </div>
  );
}

function RenderPanel() {
  const r = useViewerStore((s) => s.render);
  const set = useViewerStore((s) => s.setRender);
  const bgOptions = Object.keys(BACKGROUNDS) as RenderSettings['background'][];
  return (
    <div className="space-y-3.5">
      <Switch label="Eye-dome lighting" checked={r.edl} onChange={(edl) => set({edl})} />
      <Field label="EDL strength" value={r.edlStrength.toFixed(1)}>
        <Slider
          value={r.edlStrength}
          min={0.1}
          max={3}
          step={0.1}
          disabled={!r.edl}
          onChange={(edlStrength) => set({edlStrength})}
        />
      </Field>
      <Field label="EDL radius" value={r.edlRadius.toFixed(1)}>
        <Slider
          value={r.edlRadius}
          min={0.5}
          max={4}
          step={0.1}
          disabled={!r.edl}
          onChange={(edlRadius) => set({edlRadius})}
        />
      </Field>
      <div className="h-px bg-border-subtle" />
      <Field label="Point size" value={r.pointSize.toFixed(1)}>
        <Slider value={r.pointSize} min={0.5} max={6} step={0.1} onChange={(pointSize) => set({pointSize})} />
      </Field>
      <Segmented
        value={r.sizeMode}
        onChange={(sizeMode) => set({sizeMode})}
        options={[
          {id: 'adaptive', label: 'Adaptive'},
          {id: 'fixed', label: 'Fixed px'},
        ]}
      />
      <div className="h-px bg-border-subtle" />
      <Field label="Sun direction" value={`${Math.round(r.sunAzimuth)}°`}>
        <Slider value={r.sunAzimuth} min={0} max={360} step={1} onChange={(sunAzimuth) => set({sunAzimuth})} />
      </Field>
      <Field label="Sun elevation" value={`${Math.round(r.sunElevation)}°`}>
        <Slider value={r.sunElevation} min={5} max={90} step={1} onChange={(sunElevation) => set({sunElevation})} />
      </Field>
      <Switch label="Ground surface (DTM)" checked={r.showDtm} onChange={(showDtm) => set({showDtm})} />
      <Field label="Background">
        <div className="flex gap-2">
          {bgOptions.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => set({background: b})}
              title={b}
              className={cn(
                'h-8 flex-1 rounded-md border-2 capitalize text-[10px] font-medium cursor-pointer',
                r.background === b ? 'border-brand' : 'border-transparent',
                b === 'dark' ? 'text-white/80' : 'text-fg-muted',
              )}
              style={{background: `linear-gradient(to bottom, ${BACKGROUNDS[b].top}, ${BACKGROUNDS[b].bottom})`}}
            >
              {b}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function CoreToolbarItems() {
  const cameraMode = useViewerStore((s) => s.cameraMode);
  const setCameraMode = useViewerStore((s) => s.setCameraMode);
  const requestCamera = useViewerStore((s) => s.requestCamera);
  const busy = cameraMode === 'flythrough' || cameraMode === 'follow';
  return (
    <>
      <ToolPopover label="Colour by" icon={<Palette size={18} />}>
        <ColorModePanel />
      </ToolPopover>
      <ToolPopover label="Rendering" icon={<SlidersHorizontal size={18} />}>
        <RenderPanel />
      </ToolPopover>
      <ToolbarDivider />
      <ToolbarButton
        label="Orbit"
        active={cameraMode === 'orbit'}
        disabled={busy}
        onClick={() => setCameraMode('orbit')}
      >
        <Rotate3d size={18} />
      </ToolbarButton>
      <ToolbarButton
        label="Walk (WASD)"
        active={cameraMode === 'walk'}
        disabled={busy}
        onClick={() => setCameraMode('walk')}
      >
        <Footprints size={18} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Reset view" disabled={busy} onClick={() => requestCamera({kind: 'view', view: 'reset'})}>
        <RotateCcw size={18} />
      </ToolbarButton>
      <ToolbarButton label="Top view" disabled={busy} onClick={() => requestCamera({kind: 'view', view: 'top'})}>
        <MapIcon size={18} />
      </ToolbarButton>
      <ToolbarButton label="Side view" disabled={busy} onClick={() => requestCamera({kind: 'view', view: 'side'})}>
        <TreePine size={18} />
      </ToolbarButton>
    </>
  );
}
