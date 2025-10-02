// A simplified GeoJSON structure for polygons
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJsonMultiPolygon {
    type: 'MultiPolygon';
    coordinates: number[][][][];
}

export type GeoJsonGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

// The structure of a result object from the Nominatim API
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  geojson: GeoJsonGeometry;
}
