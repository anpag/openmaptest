import React from 'react';

interface PostcodeFormProps {
  postcode: string;
  setPostcode: (postcode: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const PostcodeForm: React.FC<PostcodeFormProps> = ({ postcode, setPostcode, onSubmit, isLoading }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
        UK Postcode
      </label>
      <div className="mt-1 flex rounded-md shadow-sm">
        <input
          type="text"
          id="postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          placeholder="e.g., SW1A 0AA or M1"
          className="flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 bg-white text-gray-900 placeholder-gray-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="relative inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          )}
          <span>Search</span>
        </button>
      </div>
       <p className="mt-2 text-xs text-gray-500">Enter a full postcode, district (e.g., M1), or sector (e.g., M1 1).</p>
    </form>
  );
};

export default PostcodeForm;
