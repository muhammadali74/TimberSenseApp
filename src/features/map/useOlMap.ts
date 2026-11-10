/** WS-H. Create one OpenLayers map per mounted container. */
import type OlMap from 'ol/Map';
import {useEffect, useRef, useState} from 'react';
import {createBaseMap} from './olBase';

export function useOlMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<OlMap | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = createBaseMap(ref.current);
    setMap(m);
    return () => {
      m.setTarget(undefined);
      m.dispose();
    };
  }, []);
  return {ref, map};
}
