/** WS-H. Bottom-right zoom / fit controls. */
import {Maximize, Minus, Plus} from 'lucide-react';
import type OlMap from 'ol/Map';
import {NavCard, NavItem} from '@/features/shell/header/NavCard';

export function MapControls({
  map,
  onFit,
  offsetRight = 0,
}: {
  map: OlMap | null;
  onFit: () => void;
  offsetRight?: number;
}) {
  const zoom = (d: number) => {
    const v = map?.getView();
    if (v) v.animate({zoom: (v.getZoom() ?? 3) + d, duration: 250});
  };
  return (
    <div className="absolute bottom-8 z-10 transition-[right]" style={{right: 16 + offsetRight}}>
      <NavCard className="h-auto flex-col py-1.5">
        <NavItem icon={<Plus size={16} />} aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1)} />
        <NavItem icon={<Minus size={16} />} aria-label="Zoom out" title="Zoom out" onClick={() => zoom(-1)} />
        <NavItem icon={<Maximize size={15} />} aria-label="Fit to view" title="Fit to view" onClick={onFit} />
      </NavCard>
    </div>
  );
}
