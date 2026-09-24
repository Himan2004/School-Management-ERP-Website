import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen, Download, Eye, Filter, Search, Loader2,
  FileText, Video, File, Image, Music, Archive, Code,
  Calendar, User, ChevronRight, X, CheckCircle,
  AlertCircle, TrendingUp, Star, Award, Clock,
  Grid3x3, List, LayoutGrid, BookMarked, Heart,
  SortAsc, SortDesc, FilterX, ChevronDown, ChevronUp,
  Globe, Youtube, ExternalLink, Play, Book, Layers
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';
import {
  Grid, Button, DataField, SelectField, Option, Heading, Modal, openModal, closeModal
} from '../../components/shared/Common_Components';

const StudentStudyMaterial = () => {
  const [studyMaterial, setStudyMaterial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('material'); // 'material' or 'syllabus'
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (location.state?.subject && studyMaterial.length > 0) {
      const passedSubjectName = location.state.subject;
      // Find a matching subject from the loaded list (case-insensitively)
      const foundSubject = [...new Set(studyMaterial.map(m => m.subject))].find(
        sub => sub.toLowerCase() === passedSubjectName.toLowerCase()
      );
      if (foundSubject) {
        setFilterSubject(foundSubject);
        setShowFilters(true);
      } else {
        setFilterSubject(passedSubjectName);
        setShowFilters(true);
      }
    }
  }, [location.state, studyMaterial]);

  const data = studyMaterial || [];
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const studyMaterialRes = await studentApi.getStudyMaterial();
        setStudyMaterial(studyMaterialRes?.data || studyMaterialRes || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to load study material');
        toast.error('Failed to load study material');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const savedFavorites = localStorage.getItem('studyMaterialFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    const savedRecentlyViewed = localStorage.getItem('studyMaterialRecentlyViewed');
    if (savedRecentlyViewed) {
      setRecentlyViewed(JSON.parse(savedRecentlyViewed));
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('studyMaterialFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save recently viewed to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('studyMaterialRecentlyViewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const handleDownload = async (material) => {
    setIsDownloading(true);
    try {
      // Track download interaction (non-blocking)
      studentApi.trackStudyMaterialInteraction(material.id, 'download').catch(() => { });

      // If backend URL is available, use it
      if (material.fileUrl && material.fileUrl !== '#') {
        window.open(material.fileUrl, '_blank');
        toast.success(`Downloading ${material.title} started!`);
      } else {
        toast.error('File URL not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async (material) => {
    setSelectedMaterial(material);
    openModal('preview-modal');

    // Update recently viewed
    const updatedRecentlyViewed = [material, ...recentlyViewed.filter(m => m.id !== material.id)].slice(0, 5);
    setRecentlyViewed(updatedRecentlyViewed);

    // Track view interaction (non-blocking)
    studentApi.trackStudyMaterialInteraction(material.id, 'view').catch(() => { });
  };

  const toggleFavorite = (materialId) => {
    if (favorites.includes(materialId)) {
      setFavorites(favorites.filter(id => id !== materialId));
      toast.success('Removed from favorites');
    } else {
      setFavorites([...favorites, materialId]);
      toast.success('Added to favorites');
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'PDF': return <FileText className="w-5 h-5 text-red-500" />;
      case 'Video': return <Video className="w-5 h-5 text-blue-500" />;
      case 'Interactive': return <Globe className="w-5 h-5 text-green-500" />;
      case 'Audio': return <Music className="w-5 h-5 text-purple-500" />;
      case 'Image': return <Image className="w-5 h-5 text-pink-500" />;
      case 'Archive': return <Archive className="w-5 h-5 text-orange-500" />;
      case 'Code': return <Code className="w-5 h-5 text-gray-700" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getDifficultyBadge = (difficulty) => {
    const config = {
      Beginner: 'bg-green-100 text-green-700',
      Intermediate: 'bg-yellow-100 text-yellow-700',
      Advanced: 'bg-red-100 text-red-700',
      'All Levels': 'bg-blue-100 text-blue-700'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config[difficulty] || 'bg-gray-100 text-gray-700'}`}>{difficulty}</span>;
  };

  const getRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < fullStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        ))}
        {hasHalfStar && (
          <div className="relative w-4 h-4">
            <Star className="absolute inset-0 text-gray-300" />
            <Star className="absolute inset-0 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </div>
        )}
        <span className="text-xs font-bold text-[#6B7280] ml-1">({rating})</span>
      </div>
    );
  };

  // Filter and Sort Logic
  const filteredMaterials = data.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.tags && material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesSubject = filterSubject === 'all' || material.subject === filterSubject;
    const matchesType = filterType === 'all' || material.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || material.difficulty === filterDifficulty;
    const matchesRating = filterRating === 'all' || material.rating >= parseFloat(filterRating);
    const matchesDate = filterDate === 'all' ||
      (filterDate === 'week' && new Date(material.uploadDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (filterDate === 'month' && new Date(material.uploadDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const matchesFavorites = !showFavoritesOnly || favorites.includes(material.id);
    return matchesSearch && matchesSubject && matchesType && matchesDifficulty && matchesRating && matchesDate && matchesFavorites;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'newest':
        comparison = new Date(b.uploadDate) - new Date(a.uploadDate);
        break;
      case 'oldest':
        comparison = new Date(a.uploadDate) - new Date(b.uploadDate);
        break;
      case 'popular':
        comparison = b.downloadCount - a.downloadCount;
        break;
      case 'rating':
        comparison = b.rating - a.rating;
        break;
      case 'name':
        comparison = a.title.localeCompare(b.title);
        break;
      default:
        comparison = 0;
    }
    return sortOrder === 'desc' ? comparison : -comparison;
  });

  const syllabusData = []; // Replace with actual API data in the future
  
  const syllabusFiltered = syllabusData.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subjects = [...new Set(data.map(m => m.subject))];
  const types = [...new Set(data.map(m => m.type))];
  const difficulties = [...new Set(data.map(m => m.difficulty))];

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterSubject('all');
    setFilterType('all');
    setFilterDifficulty('all');
    setFilterRating('all');
    setFilterDate('all');
    setSortBy('newest');
    setSortOrder('desc');
    setShowFavoritesOnly(false);
    toast.success('All filters cleared');
  };

  if (loading && !data.length) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Loading study material...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <Heading
        primaryText="Study Material"
        secondaryText="Library"
        size={12}
        showAnimations={true}
      />

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('material')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-4 ${activeTab === 'material' ? 'border-[#223F74] text-[#223F74]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Study Material
        </button>
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-4 ${activeTab === 'syllabus' ? 'border-[#223F74] text-[#223F74]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Syllabus
        </button>
      </div>

      {activeTab === 'material' && (
        <>
          {/* Advanced Filters */}
          <Grid cols={12} gap={4}>
            <DataField
              id="search"
              placeholder="Search study material by title, subject, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              size={12}
            />
          </Grid>

          {/* Standard filters using Common Components */}
          <Grid cols={12} gap={4}>
            <SelectField label="Subject" id="filterSubject" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} size={3}>
              <Option value="all" label="Any Subject (Categories)" />
              {subjects.map(sub => <Option key={sub} value={sub} label={sub} />)}
            </SelectField>

            <SelectField label="Type" id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)} size={3}>
              <Option value="all" label="Any Type" />
              {types.map(type => <Option key={type} value={type} label={type} />)}
            </SelectField>

            <SelectField label="Difficulty" id="filterDifficulty" value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} size={3}>
              <Option value="all" label="Any Difficulty" />
              {difficulties.map(diff => <Option key={diff} value={diff} label={diff} />)}
            </SelectField>

            <SelectField label="Rating" id="filterRating" value={filterRating} onChange={(e) => setFilterRating(e.target.value)} size={3}>
              <Option value="all" label="Any Rating" />
              <Option value="4" label="4+ Stars" />
              <Option value="4.5" label="4.5+ Stars" />
              <Option value="4.8" label="4.8+ Stars" />
            </SelectField>
          </Grid>

          {/* Results Count & Clear Filters */}
          <div className="flex justify-between items-center bg-white p-4 rounded-[24px] border border-[#E7E2DB] shadow-sm">
            <p className="text-sm font-semibold text-[#223F74]">
              {filterSubject === 'all' ? `Showing Subject Categories` : `Found ${filteredMaterials.length} resources in ${filterSubject}`}
            </p>
            <button onClick={clearAllFilters} className="text-sm font-bold text-[#D66B5F] hover:text-[#c05d52] transition-colors">
              Clear Filters
            </button>
          </div>

          {/* Material Cards or Subject Categories */}
          {filterSubject === 'all' && searchTerm === '' ? (
            <Grid cols={12} gap={6}>
              {subjects.map((subject, idx) => {
                const subjectCount = data.filter(m => m.subject === subject).length;
                return (
                  <div key={subject} onClick={() => setFilterSubject(subject)} className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white p-6 rounded-[24px] cursor-pointer shadow-sm hover:shadow-lg transition-all border border-[#E7E2DB] flex items-center gap-5 hover:-translate-y-1">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F4F7FB] to-[#e4ebf5] text-[#223F74] flex items-center justify-center font-black text-2xl shadow-inner border border-white">
                      {subject.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-[#223F74] text-xl mb-1">{subject}</h3>
                      <p className="text-sm font-semibold text-[#6B7280]">{subjectCount} Material{subjectCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="ml-auto text-gray-400">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                );
              })}
            </Grid>
          ) : (
            <Grid cols={12} gap={6}>
        {filteredMaterials.map((material) => (
          <div key={material.id} className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col bg-white rounded-[24px] overflow-hidden border border-[#E7E2DB] shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">

            <div className="relative h-44 bg-gradient-to-br from-[#F4F7FB] to-[#e4ebf5] flex flex-col items-center justify-center p-4">
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(material.id); }}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(material.id) ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                {getFileIcon(material.type)}
              </div>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-[#223F74] shadow-sm tracking-wide">
                {material.type}
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-black text-[#223F74] line-clamp-1 flex-1">{material.title}</h3>
                </div>

                <p className="text-sm font-semibold text-[#6B7280] mb-4">Subject: {material.subject}</p>

                <div className="flex items-center justify-between mb-4">
                  {getDifficultyBadge(material.difficulty)}
                  {getRatingStars(material.rating)}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">{material.description}</p>

                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 mb-6 bg-gray-50 p-3 rounded-2xl">
                  <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {material.size}</span>
                  <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> {material.downloadCount}</span>
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {material.views}</span>
                </div>
              </div>

              <Grid cols={12} gap={3}>
                <Button
                  text="View Syllabus"
                  icon={<Eye className="w-4 h-4" />}
                  variant="secondary"
                  onClick={() => handlePreview(material)}
                  size={6}
                />
                <Button
                  text="Download"
                  icon={<Download className="w-4 h-4" />}
                  variant="primary"
                  disabled={isDownloading}
                  onClick={() => handleDownload(material)}
                  size={6}
                />
              </Grid>
            </div>
          </div>
        ))}
        {filteredMaterials.length === 0 && (
          <div className="col-span-12 text-center py-12">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-[#223F74] mb-2">No materials found</h3>
            <p className="text-[#6B7280]">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </Grid>
          )}
        </>
      )}
      {activeTab === 'syllabus' && (
        <>
          <Grid cols={12} gap={4}>
            <DataField
              id="search-syllabus"
              placeholder="Search syllabus by title or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              size={12}
            />
          </Grid>
          <Grid cols={12} gap={6}>
            {syllabusFiltered.map(syllabus => (
              <div key={syllabus.id} className="col-span-12 md:col-span-6 bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                <div className="p-4 bg-red-50 rounded-2xl">
                  <FileText className="w-8 h-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-[#223F74]">{syllabus.title}</h3>
                  <p className="text-sm font-semibold text-[#6B7280] mb-4">{syllabus.subject} • {syllabus.class} • {syllabus.size}</p>
                  <div className="flex gap-3">
                    <Button 
                      text="View" 
                      icon={<Eye className="w-4 h-4" />} 
                      variant="secondary" 
                      onClick={() => handlePreview({ ...syllabus, type: 'PDF', pages: 10, description: 'Syllabus details.', fileUrl: syllabus.fileUrl })} 
                    />
                    <Button 
                      text="Download" 
                      icon={<Download className="w-4 h-4" />} 
                      variant="primary" 
                      onClick={() => handleDownload(syllabus)} 
                    />
                  </div>
                </div>
              </div>
            ))}
            {syllabusFiltered.length === 0 && (
              <div className="col-span-12 text-center py-12">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-[#223F74] mb-2">No syllabus found</h3>
                <p className="text-[#6B7280]">Try adjusting your search to find what you're looking for.</p>
              </div>
            )}
          </Grid>
        </>
      )}

      {/* Preview Modal */}
      <Modal id="preview-modal" title="Material Preview" size="xl">
        {selectedMaterial && (
          <div className="space-y-6 text-left animate-in fade-in duration-200">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-[24px]">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#E7E2DB]">
                {getFileIcon(selectedMaterial.type)}
              </div>
              <div>
                <h2 className="text-xl font-black text-[#223F74]">{selectedMaterial.title}</h2>
                <p className="text-sm font-semibold text-[#6B7280]">{selectedMaterial.subject} • {selectedMaterial.type} • {selectedMaterial.size}</p>
              </div>
            </div>
            
            <div className="bg-gray-100 rounded-[24px] overflow-hidden flex flex-col items-center justify-center min-h-[300px] border border-[#E7E2DB] shadow-inner py-8">
              {selectedMaterial.type === 'PDF' && (
                <div className="text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#E7E2DB]">
                    <FileText className="w-12 h-12 text-red-500" />
                  </div>
                  <p className="text-[#223F74] font-bold text-lg">PDF Document - {selectedMaterial.pages} pages</p>
                  {selectedMaterial.fileUrl !== '#' ? (
                    <a href={selectedMaterial.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block px-8 py-3.5 bg-[#F59B87] text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-[#EC856D] hover:shadow-xl hover:-translate-y-1 transition-all shadow-lg shadow-[#F59B87]/30">
                      Open PDF in New Tab
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-[#6B7280] mt-3">Preview not available. Please download to view.</p>
                  )}
                </div>
              )}
              {selectedMaterial.type === 'Video' && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {selectedMaterial.fileUrl !== '#' ? (
                    <video controls className="max-w-full max-h-[500px] rounded-[16px] shadow-sm">
                      <source src={selectedMaterial.fileUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="text-center">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#E7E2DB]">
                        <Play className="w-12 h-12 text-blue-500 ml-1" />
                      </div>
                      <p className="text-[#223F74] font-bold text-lg">Video Tutorial - {selectedMaterial.duration}</p>
                      <p className="text-sm font-semibold text-[#6B7280] mt-3">Video preview will be available after download.</p>
                    </div>
                  )}
                </div>
              )}
              {selectedMaterial.type === 'Image' && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  {selectedMaterial.fileUrl !== '#' ? (
                    <img src={selectedMaterial.fileUrl} alt={selectedMaterial.title} className="max-w-full max-h-[400px] object-contain rounded-[16px] shadow-sm" />
                  ) : (
                    <div className="text-center">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#E7E2DB]">
                        <Image className="w-12 h-12 text-pink-500" />
                      </div>
                      <p className="text-[#223F74] font-bold text-lg">Image Resource</p>
                      <p className="text-sm font-semibold text-[#6B7280] mt-3">Preview not available. Please download to view.</p>
                    </div>
                  )}
                </div>
              )}
              {selectedMaterial.type !== 'PDF' && selectedMaterial.type !== 'Video' && selectedMaterial.type !== 'Image' && (
                <div className="text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#E7E2DB]">
                    {getFileIcon(selectedMaterial.type)}
                  </div>
                  <p className="text-[#223F74] font-bold text-lg mt-4">{selectedMaterial.type} Resource</p>
                  <p className="text-sm font-semibold text-[#6B7280] mt-3">Preview not supported for this file type.</p>
                </div>
              )}
            </div>
            

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E7E2DB]">
              <Button 
                text="Close" 
                variant="secondary" 
                onClick={() => closeModal('preview-modal')} 
                size={3} 
              />
              <Button 
                text="Download Material" 
                icon={<Download className="w-4 h-4" />} 
                variant="primary" 
                disabled={isDownloading} 
                onClick={() => {
                  handleDownload(selectedMaterial);
                  closeModal('preview-modal');
                }} 
                size={4} 
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default StudentStudyMaterial;