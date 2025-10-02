// anpag/openmaptest/openmaptest-66d4ad2d57a47131c6120825c7a749c484b9064d/services/geoService.ts
import type { Feature, FeatureCollection } from 'geojson';

/**
 * Extracts the postcode area (e.g., "SW") and district (e.g., "SW1") from a full postcode.
 * @param postcode The input postcode.
 * @returns An object with the area and district.
 */
const getPostcodeParts = (postcode: string): { area: string, district: string } => {
    const cleaned = postcode.trim().toUpperCase().replace(/ +/g, ' ');
    const district = cleaned.split(' ')[0];
    const area = district.replace(/\d.*/, ''); // Remove numbers and trailing letters to get the area
    return { area, district };
};

/**
 * Fetches the specific GeoJSON boundary feature for a UK postcode district.
 *
 * This new approach is much more reliable than Nominatim because it uses a direct data source
 * for postcode district boundaries.
 *
 * @param postcode The UK postcode to search for.
 * @returns A promise that resolves to the GeoJSON Feature for the postcode district.
 * @throws An error if the postcode is invalid or the boundary data cannot be found.
 */
export const fetchPostcodeBoundary = async (postcode: string): Promise<Feature> => {
  if (!postcode || postcode.trim().length === 0) {
    throw new Error('Please enter a postcode.');
  }

  const { area, district } = getPostcodeParts(postcode);

  if (!area) {
    throw new Error('Invalid postcode format.');
  }

  // This URL points to a repository of pre-made GeoJSON files for each UK postcode area.
  // This is a far more direct and reliable source for boundaries than Nominatim.
  const geoJsonUrl = `https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/master/geojson/${area}.geojson`;

  console.log(`Fetching boundary data for area "${area}" from: ${geoJsonUrl}`);

  const response = await fetch(geoJsonUrl);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`No boundary data found for postcode area "${area}". The postcode may be incorrect or data may not be available.`);
    }
    throw new Error(`Failed to fetch boundary data. Status: ${response.status}`);
  }

  const collection: FeatureCollection = await response.json();

  // Now, find the specific feature within the collection that matches our postcode district.
  const feature = collection.features.find(
    (f) => f.properties?.name === district
  );

  if (!feature) {
    throw new Error(`Could not find a specific boundary for postcode district "${district}" within the "${area}" area data.`);
  }

  console.log(`Successfully found feature for "${district}"`);
  
  // We add a unique ID to the feature to help React identify it for re-rendering.
  feature.properties!.id = `${district}-${new Date().getTime()}`;

  return feature;
};