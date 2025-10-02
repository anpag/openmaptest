import React, { useState, useCallback } from 'react';
import PostcodeForm from './components/PostcodeForm';
import MapDisplay from './components/MapDisplay';
import { fetchPostcodeBoundary } from './services/geoService';
import type { NominatimResult } from './types';

const App: React.FC = () => {
  const [postcode, setPostcode] = useState<string>('SW1A 0AA');
  const [geoJsonData, setGeoJsonData] = useState<NominatimResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitial, setIsInitial] = useState<boolean>(true);

  const handleSearch = useCallback(async () => {
    if (!postcode) {
      setError('Please enter a UK postcode.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeoJsonData(null);
    setIsInitial(false);

    try {
      const data = await fetchPostcodeBoundary(postcode);
      setGeoJsonData(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [postcode]);

  return (
    <div className="flex h-screen font-sans bg-gray-100 text-gray-800">
      <aside className="w-full md:w-1/3 lg:w-1/4 p-6 bg-white shadow-lg overflow-y-auto flex flex-col z-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Postcode Visualizer</h1>
          <p className="text-gray-600 mt-1">Map UK postcode areas instantly.</p>
        </header>
        <main className="flex-grow">
          <PostcodeForm
            postcode={postcode}
            setPostcode={setPostcode}
            onSubmit={handleSearch}
            isLoading={isLoading}
          />
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md animate-pulse">
              <strong>Error:</strong> {error}
            </div>
          )}
        </main>
        <footer className="text-center text-xs text-gray-400 mt-6">
          <p>Powered by OpenStreetMap & Nominatim.</p>
        </footer>
      </aside>
      <section className="flex-grow h-full">
        <MapDisplay geoJsonData={geoJsonData} isLoading={isLoading} isInitial={isInitial} />
      </section>
    </div>
  );
};

export default App;
