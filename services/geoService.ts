import type { NominatimResult } from '../types';

/**
 * Generates a hierarchy of postcodes from most to least specific.
 * (This function is well-designed and does not need major changes.)
 * e.g., "SW1A 0AA" -> ["SW1A 0AA", "SW1A", "SW1", "SW"]
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
    while (current.length > 1) {
        // Remove trailing letter(s) if they exist and the remainder has numbers
        if (/[A-Z]$/.test(current) && /\d/.test(current)) {
            current = current.slice(0, -1);
            hierarchy.push(current);
        } 
        // Remove trailing number(s) to get the postcode area (e.g., SW1 -> SW)
        else if (/\d$/.test(current)) {
            const area = current.replace(/\d+$/, '');
            if (area.length > 0 && area !== current) {
              current = area;
              hierarchy.push(current);
            } else {
                break; // Can't shorten further
            }
        } else {
            // Can't be shortened in a standard way (e.g., just "SW")
            break;
        }
    }
    
    // Return unique values, preserving order of specificity
    return [...new Set(hierarchy)];
};


/**
 * **[REVISED]** Scores a Nominatim result based on its relevance to the postcode query.
 * This version prioritizes structured address data and penalizes incorrect boundary types.
 * @param result - A single result from the Nominatim API.
 * @param query - The postcode string that was searched for.
 * @returns A numerical score. Higher is better.
 */
const scoreResult = (result: NominatimResult, query: string): number => {
    let score = 0;
    const displayName = result.display_name.toUpperCase();
    const queryUpper = query.toUpperCase();

    // --- Positive Scoring ---

    // GOLD STANDARD: It's explicitly a postal code boundary.
    if (result.class === 'boundary' && result.type === 'postal_code') {
        score += 100;
    }

    // EXCELLENT INDICATOR: The display name starts with the exact postcode query.
    // This is very reliable for "SW1, London..." vs "City of Westminster, ... SW1A 0AA".
    if (displayName.startsWith(queryUpper + ',') || displayName.startsWith(queryUpper + ' ')) {
        score += 80;
    }

    // STRONG INDICATOR: The structured address object has a postcode that matches our query.
    // This is much more reliable than parsing the display_name.
    if (result.address?.postcode?.toUpperCase().startsWith(queryUpper)) {
        score += 50;
    }
    
    // OK INDICATOR: The query is contained within the display name.
    // We lower the score here as it can be ambiguous.
    else if (displayName.includes(queryUpper)) {
        score += 20;
    }

    // A small boost from the API's own importance score.
    score += (result.importance || 0) * 10;
    
    // --- Negative Scoring (Penalties) ---
    
    // PENALTY: This is the crucial change. If it's a boundary, but for an administrative
    // area, city, or suburb, it's likely NOT the postcode boundary we want.
    if (result.class === 'boundary' && ['administrative', 'county', 'city', 'suburb', 'borough'].includes(result.type)) {
        score -= 60;
    }

    return score;
};


/**
 * **[REVISED]** Searches Nominatim for a single postcode string.
 * @param postcode The postcode to search for.
 * @returns A high-confidence result, or null.
 */
const searchNominatim = async (postcode: string): Promise<NominatimResult | null> => {
  const encodedPostcode = encodeURIComponent(`${postcode}, United Kingdom`);
  // addressdetails=1 is essential for the improved scoring logic
  const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodedPostcode}&format=json&polygon_geojson=1&limit=10&addressdetails=1`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      // It's good practice to have a descriptive User-Agent for the Nominatim API
      'User-Agent': 'UKPostcodeAreaVisualizer/1.4 (your-email@example.com)'
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
  
  // Log the top results for debugging to see how they were scored
  console.log(`Scored results for query: "${postcode}"`);
  console.table(scoredResults.map(r => ({ name: r.result.display_name.slice(0, 60), score: r.score, type: r.result.type })));

  const bestMatch = scoredResults[0];

  // **THE FIX**: Instead of just score > 0, we introduce a confidence threshold.
  // A score of 50 is a good starting point, meaning it's likely a decent match.
  const MINIMUM_CONFIDENCE_SCORE = 50;
  if (bestMatch && bestMatch.score >= MINIMUM_CONFIDENCE_SCORE) {
    console.log(`Found best match for "${postcode}": ${bestMatch.result.display_name} with score ${bestMatch.score}`);
    return bestMatch.result;
  }
  
  console.log(`No result for "${postcode}" met the minimum score of ${MINIMUM_CONFIDENCE_SCORE}. Best score was ${bestMatch?.score || 'N/A'}.`);
  return null;
}

// The delay function is fine as is.
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * The main exported function. This orchestration logic is sound and does not need changes.
 */
export const fetchPostcodeBoundary = async (postcode: string): Promise<NominatimResult> => {
  if (!postcode || postcode.trim().length === 0) {
      throw new Error('Please enter a postcode.');
  }
  const postcodesToTry = getPostcodesToTry(postcode);
  console.log('Attempting search with hierarchy:', postcodesToTry);

  for (let i = 0; i < postcodesToTry.length; i++) {
      const pc = postcodesToTry[i];
      const result = await searchNominatim(pc);
      if (result) {
          return result;
      }
      
      // Don't delay after the very last attempt
      if (i < postcodesToTry.length - 1) {
        await delay(1000); // Wait 1 sec to respect Nominatim API usage policy (max 1 req/sec)
      }
  }

  throw new Error(`No geographical boundary data found for this postcode. We tried searching for "${postcodesToTry.join('", "')}" but found no matching areas.`);
};

// You would need to define the NominatimResult type, for example:
/*
export interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
    geojson: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: any[];
    };
    address?: {
        postcode?: string;
        city?: string;
        county?: string;
        country?: string;
        // ... other address properties
    };
}
*/