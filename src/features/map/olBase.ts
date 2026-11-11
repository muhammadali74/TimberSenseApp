/**
 * WS-H. OpenLayers base map: Esri World Imagery (no API key) + boundaries/places labels.
 * Coordinates in the app are WGS84 [lon, lat]; the map view is EPSG:3857.
 */

import {defaults as defaultControls} from 'ol/control/defaults';
import ScaleLine from 'ol/control/ScaleLine';
import {boundingExtent, buffer as bufferExtent, type Extent} from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import OlMap from 'ol/Map';
import {fromLonLat} from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';
import type {LonLat} from '@/types';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

export function createBaseMap(target: HTMLElement): OlMap {
  const imagery = new TileLayer({
    source: new XYZ({
      url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
      maxZoom: 19,
      crossOrigin: 'anonymous',
      attributions: 'Imagery © Esri, Maxar, Earthstar Geographics',
    }),
  });
  const labels = new TileLayer({
    source: new XYZ({
      url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
      maxZoom: 19,
      crossOrigin: 'anonymous',
    }),
    opacity: 0.9,
  });
  return new OlMap({
    target,
    layers: [imagery, labels],
    controls: defaultControls({zoom: false, rotate: false, attributionOptions: {collapsible: true}}).extend([
      new ScaleLine({units: 'metric', bar: false}),
    ]),
    view: new View({center: fromLonLat([20, 30]), zoom: 2, maxZoom: 19.5, minZoom: 2}),
  });
}

export const toMap = (ll: LonLat) => fromLonLat(ll);

export function extentOf(points: LonLat[], padM = 0): Extent {
  const e = boundingExtent(points.map((p) => fromLonLat(p)));
  return padM ? bufferExtent(e, padM) : e;
}

/** Animated fly-to an extent (SylvaSense-style). Padding in px: [top, right, bottom, left]. */
export function flyTo(
  map: OlMap,
  extent: Extent,
  padding: number[] = [100, 80, 80, 80],
  duration = 1400,
  maxZoom = 18,
) {
  map.getView().fit(extent, {padding, duration, maxZoom});
}
