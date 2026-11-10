/** WS-H. Plot markers: true-size plot circles + numbered bubbles. */
import Feature from 'ol/Feature';
import CircleGeom from 'ol/geom/Circle';
import Point from 'ol/geom/Point';
import type {Block} from '@/types';
import {toMap} from './olBase';

/** Mercator distances are stretched by 1/cos(lat). */
export function plotCircle(center: [number, number], radiusM: number) {
  return new CircleGeom(toMap(center), radiusM / Math.cos((center[1] * Math.PI) / 180));
}

export function plotFeatures(block: Block) {
  return block.plots.flatMap((p, i) => {
    const props = {plotId: p.id, status: p.status, index: i + 1, real: !!p.dataPath};
    const radius = Math.sqrt((p.summary?.plotAreaM2 ?? 400) / Math.PI);
    return [
      new Feature({geometry: plotCircle(p.center, radius), kind: 'circle', ...props}),
      new Feature({geometry: new Point(toMap(p.center)), kind: 'marker', ...props}),
    ];
  });
}
