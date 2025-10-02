import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { NominatimResult } from '../types';

// Component to handle map view updates
const MapUpdater: React.FC<{ geoJsonData: NominatimResult | null }> = ({ geoJsonData }) => {
  const map = useMap();

  useEffect(() => {
    if (geoJsonData) {
      const [south, north, west, east] = geoJsonData.boundingbox.map(parseFloat);
      const bounds: LatLngBoundsExpression = [[south, west], [north, east]];
      map.flyToBounds(bounds, { padding: [50, 50] });
    }
  }, [geoJsonData, map]);

  return null;
};

interface MapDisplayProps {
  geoJsonData: NominatimResult | null;
  isLoading: boolean;
  isInitial: boolean;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ geoJsonData, isLoading, isInitial }) => {
  const defaultCenter: [number, number] = [54.5, -3.4359]; // Center of UK
  const defaultZoom = 6;

  const geoJsonStyle = {
    color: '#1e40af',       // A deep blue
    weight: 2,
    opacity: 0.8,
    fillColor: '#60a5fa',   // A lighter blue
    fillOpacity: 0.4,
  };

  return (
    <div className="relative w-full h-full bg-gray-300">
      <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom={true} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoJsonData && <GeoJSON key={geoJsonData.place_id} data={geoJsonData.geojson} style={geoJsonStyle} />}
        <MapUpdater geoJsonData={geoJsonData} />
      </MapContainer>
      
      {(isLoading || isInitial) && (
        <div className="absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center text-white p-8 bg-gray-900 bg-opacity-70 rounded-lg shadow-2xl">
            {isInitial ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-2xl font-bold">Ready to Explore</h2>
                <p className="mt-2 text-lg">Enter a UK postcode to begin.</p>
              </>
            ) : (
               <>
                <svg className="animate-spin mx-auto h-12 w-12 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="text-2xl font-bold">Fetching Data...</h2>
                <p className="mt-2 text-lg">Drawing the map for you.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;
