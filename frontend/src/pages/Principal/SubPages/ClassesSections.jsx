import React from 'react';
import { LayoutGrid } from 'lucide-react';

const ClassesSections = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="md:ml-64 mt-20 p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <LayoutGrid size={48} className="mx-auto mb-4 text-blue-600 opacity-50" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Classes & Sections</h2>
          <p className="text-gray-500">Manage classes and sections</p>
        </div>
      </main>
    </div>
  );
};

export default ClassesSections;
