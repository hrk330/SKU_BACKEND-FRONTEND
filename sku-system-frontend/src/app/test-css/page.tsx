'use client';

import React from 'react';

const TestCSSPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          CSS Test Page
        </h1>
        
        {/* Test basic Tailwind classes */}
        <div className="space-y-4">
          <div className="p-4 bg-blue-500 text-white rounded">
            Blue background with white text
          </div>
          
          <div className="p-4 bg-green-500 text-white rounded">
            Green background with white text
          </div>
          
          <div className="p-4 bg-red-500 text-white rounded">
            Red background with white text
          </div>
          
          <div className="p-4 bg-yellow-500 text-black rounded">
            Yellow background with black text
          </div>
        </div>
        
        {/* Test responsive design */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-500 text-white rounded text-center">
            Responsive 1
          </div>
          <div className="p-4 bg-indigo-500 text-white rounded text-center">
            Responsive 2
          </div>
          <div className="p-4 bg-pink-500 text-white rounded text-center">
            Responsive 3
          </div>
        </div>
        
        {/* Test custom utilities */}
        <div className="mt-8">
          <button className="focus-ring btn-hover bg-blue-600 text-white px-6 py-3 rounded-lg">
            Custom Utility Test
          </button>
        </div>
        
        {/* Test if styles are being applied */}
        <div className="mt-8 p-4 border-2 border-dashed border-gray-400">
          <p className="text-sm text-gray-600">
            If you can see this text with proper styling, colors, and layout, 
            then Tailwind CSS is working correctly!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestCSSPage;
