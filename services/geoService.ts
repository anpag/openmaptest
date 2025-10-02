import type { NominatimResult } from '../types';

/**
 * Generates a hierarchy of postcodes from most to least specific.
 * e.g., "SW1A 0AA" -> ["SW1A 0AA", "SW1A", "SW1", "SW"]
 * e.g., "SE1" -> ["SE1", "SE"]
 * @param postcode The full UK postcode.
 * @returns An array of postcode strings to try.
 */
const getPostcodesToTry = (postcode: string): string[] => {
    const cleaned = postcode.trim().toUpperCase().replace(/ +/g, ' '); // Normalize spaces
    const hierarchy: string[] = [];

    // Add the full, cleaned postcode if it contains a space (likely a full postcode)
    if (cleaned.includes(' ')) {
        hierarchy.push(cleaned);
    }
    
    // Start with the outward code (or the whole string if no space)
    let current = cleaned.split(' ')[0];
    hierarchy.push(current);

    // Progressively shorten the outward code to get broader areas
    // e.g., SW1A -> SW1 -> SW
    while (current.length > 2) {
        // Remove trailing letter(s) if they exist and the remainder is not just letters
        // (e.g., SW1A -> SW1, but W1A -> W1)
        if (/[A-Z]$/.test(current) && /\d/.test(current)) {
            current = current.slice(0, -1);
            hierarchy.push(current);
        } 
        // Remove trailing number(s)
        // e.g., SE21 -> SE2 -> SE
        else if (/\d$/.test(current)) {
            current = current.replace(/\d+$/, '');
            if (current.length > 0) {
              hierarchy.push(current);
            }
        } else {
            // Can't be shortened in a standard way
            break;
        }
    }
    
    // Return unique values, preserving order of specificity
    return [...new Set(hierarchy)];
};


/**
 * Scores a Nominatim result based on its relevance to the postcode query.
 * @param result - A single result from the Nominatim API.
 * @param query - The postcode string that was searched for.
 * @returns A numerical score. Higher is better.
 */
const scoreResult = (result: NominatimResult, query: string): number => {
    let score = 0;
    const displayName = result.display_name.toUpperCase();
    const queryUpper = query.toUpperCase();

    // Highest priority: It's explicitly a postal code boundary
    if (result.class === 'boundary' && result.type === 'postal_code') {
        score += 100;
    }

    // Strong indicator: The display name starts with the exact postcode query.
    // This is a very reliable way to find the correct area.
    if (displayName.startsWith(queryUpper + ',') || displayName.startsWith(queryUpper + ' ')) {
        score += 80;
    }
    
    // Medium indicator: The query is contained within the display name.
    // Useful for cases where the postcode is part of a longer name.
    else if (displayName.includes(queryUpper)) {
        score += 30;
    }

    // Bonus for being a boundary of any kind
    if (result.class === 'boundary') {
        score += 20;
    }

    // A small boost from the API's own importance score
    score += (result.importance || 0) * 10;

    return score;
};


const searchNominatim = async (postcode: string): Promise<NominatimResult | null> => {
  const encodedPostcode = encodeURIComponent(`${postcode}, United Kingdom`);
  // Fetch more candidates to score and get address details for better filtering
  const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodedPostcode}&format=json&polygon_geojson=1&limit=10&addressdetails=1`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'UKPostcodeVisualizer/1.3 (Educational project)'
    }
  });

  if (!response.ok) {
    console.error(`API request for ${postcode} failed with status ${response.status}.`);
    return null;
  }

  const data: NominatimResult[] = await response.json();

  if (!data || data.length === 0) {
    return null;
  }
  
  const resultsWithShape = data.filter(r => r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon'));
  if (resultsWithShape.length === 0) return null;

  const scoredResults = resultsWithShape.map(result => ({
    result,
    score: scoreResult(result, postcode),
  })).sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredResults[0];

  // **THE FIX**: Instead of requiring a "perfect" score, we now take the highest-scoring
  // result as our best effort. This is far more resilient to variations in API data.
  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.result;
  }
  
  // If no result scored above 0, it's likely irrelevant.
  return null;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Fetches geographical boundary data for a given UK postcode.
 * It attempts to search for the full postcode, then progressively broader areas if no boundary is found.
 * @param postcode - The UK postcode to search for.
 * @returns A promise that resolves to the first found Nominatim result with a polygon/multipolygon.
 * @throws An error if the postcode is invalid, not found, or has no boundary data after all attempts.
 */
export const fetchPostcodeBoundary = async (postcode: string): Promise<NominatimResult> => {
  if (!postcode || postcode.trim().length === 0) {
      throw new Error('Please enter a postcode.');
  }
  const postcodesToTry = getPostcodesToTry(postcode);

  for (let i = 0; i < postcodesToTry.length; i++) {
      const pc = postcodesToTry[i];
      const result = await searchNominatim(pc);
      if (result) {
          return result;
      }
      
      if (i < postcodesToTry.length - 1) {
        await delay(1000); // Wait 1 sec to respect Nominatim API usage policy (max 1 req/sec)
      }
  }

  throw new Error(`No geographical boundary data found for this postcode. We tried searching for "${postcodesToTry.join('", "')}" but found no matching areas.`);
};