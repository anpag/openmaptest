// anpag/openmaptest/openmaptest-66d4ad2d57a47131c6120825c7a749c484b9064d/types.ts

// This file can now be simplified or removed if you install `@types/geojson`.
// For now, let's define the Feature type we need.
import type { Feature as GeoJsonFeature, Geometry } from 'geojson';

export interface Feature<G = Geometry, P = { [name: string]: any }> extends GeoJsonFeature<G, P> {
  // We don't need to add anything here, but having this file allows for future extension.
}