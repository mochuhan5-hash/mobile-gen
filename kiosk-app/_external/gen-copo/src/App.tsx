import React, { useState } from 'react';
import { GalleryPage } from './components/medical/GalleryPage';
import { TasksPage } from './components/medical/TasksPage';
import { LayoutGrid, ClipboardList, ChevronLeft } from 'lucide-react';

type PageType = 'gallery' | 'tasks';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('gallery');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">就医助手</h1>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setCurrentPage('gallery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentPage === 'gallery' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutGrid size={16} />
            UI Kit
          </button>
          <button 
            onClick={() => setCurrentPage('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentPage === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ClipboardList size={16} />
            Tasks
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {currentPage === 'gallery' ? <GalleryPage /> : <TasksPage />}
      </div>

      {/* Global CSS for hiding scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
