import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'

/**
 * The Map section's basemap: OpenFreeMap vector tiles (OpenMapTiles schema,
 * free, no key or account) drawn with a custom dark style to match the site.
 * Every colour lives in PALETTE; the layer list below only decides what is
 * drawn and from which zoom. See docs/DEVELOPING.md "Map basemap".
 */

/** TileJSON for the whole planet. Swap for another OpenMapTiles-schema source if needed. */
export const TILES_URL = 'https://tiles.openfreemap.org/planet'
/** Label fonts (signed-distance-field glyphs); fonts must exist on this server. */
export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
const FONT_REGULAR = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']

export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · ' +
  'Data <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>'

export const PALETTE = {
  land: '#15213d',
  landcover: '#172644',
  water: '#070e1f',
  coastline: 'rgba(122, 224, 255, 0.32)',
  river: '#0a1222',
  border: 'rgba(122, 224, 255, 0.35)',
  borderState: 'rgba(122, 224, 255, 0.14)',
  road: 'rgba(170, 190, 230, 0.09)',
  roadMajor: 'rgba(255, 179, 107, 0.13)',
  label: '#9fb0cf',
  labelStrong: '#d6e2f5',
  labelHalo: 'rgba(3, 5, 11, 0.85)',
  /** the glow around the globe's edge */
  horizon: '#0b2a44',
}

const name: ExpressionSpecification = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']]

export const mapStyle: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  glyphs: GLYPHS_URL,
  sky: {
    'sky-color': PALETTE.horizon,
    'horizon-color': PALETTE.horizon,
    'fog-color': PALETTE.water,
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.9,
    // the atmosphere glow shows on the globe, then fades out as the map flattens
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.75, 5, 0.75, 7, 0],
  },
  sources: {
    omt: { type: 'vector', url: TILES_URL, attribution: ATTRIBUTION },
  },
  layers: [
    { id: 'land', type: 'background', paint: { 'background-color': PALETTE.land } },
    {
      id: 'landcover',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest', 'grass']]],
      paint: { 'fill-color': PALETTE.landcover, 'fill-opacity': 0.6 },
    },
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': PALETTE.water } },
    {
      id: 'coastline',
      type: 'line',
      source: 'omt',
      'source-layer': 'water',
      paint: {
        'line-color': PALETTE.coastline,
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 8, 0.9, 14, 1.4],
      },
    },
    {
      id: 'rivers',
      type: 'line',
      source: 'omt',
      'source-layer': 'waterway',
      minzoom: 8,
      filter: ['==', ['get', 'class'], 'river'],
      paint: { 'line-color': PALETTE.river, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 2.5] },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': PALETTE.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 16, 2.5] },
    },
    {
      id: 'roads-major',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 6,
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': PALETTE.roadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 12, 1.2, 16, 3] },
    },
    {
      id: 'border-state',
      type: 'line',
      source: 'omt',
      'source-layer': 'boundary',
      minzoom: 3,
      filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': PALETTE.borderState, 'line-width': 0.7, 'line-dasharray': [3, 2] },
    },
    {
      id: 'border-country',
      type: 'line',
      source: 'omt',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1], ['!=', ['get', 'disputed'], 1]],
      paint: { 'line-color': PALETTE.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 6, 1.1] },
    },
    {
      id: 'label-country',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      minzoom: 1.5,
      maxzoom: 8,
      // big countries on the whole globe, the rest as you zoom in (rank 1 = largest)
      filter: ['all', ['==', ['get', 'class'], 'country'], ['<=', ['get', 'rank'], ['step', ['zoom'], 1, 2.5, 3, 3.5, 6]]],
      layout: {
        'text-field': name,
        'text-font': FONT_BOLD,
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 13],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.18,
        'text-max-width': 8,
      },
      paint: { 'text-color': PALETTE.label, 'text-halo-color': PALETTE.labelHalo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-city',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      minzoom: 3.5,
      // cities from zoom 3.5, towns once zoomed in past 8 so the map stays quiet
      filter: ['any', ['==', ['get', 'class'], 'city'], ['all', ['==', ['get', 'class'], 'town'], ['>=', ['zoom'], 8]]],
      layout: {
        'text-field': name,
        'text-font': FONT_REGULAR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 13, 14, 15],
        'text-max-width': 8,
        // big cities first; towns only once there is room
        'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      },
      paint: {
        'text-color': PALETTE.labelStrong,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.65, 8, 0.9],
        'text-halo-color': PALETTE.labelHalo,
        'text-halo-width': 1.2,
      },
    },
  ],
}
