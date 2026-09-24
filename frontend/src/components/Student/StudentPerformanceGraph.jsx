import React, { useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

const StudentPerformanceGraph = React.forwardRef(({
  title = "Performance Trend",
  subtitle = "Monthly academic progress",
  data,
  options,
  type = 'line',       // 'line' or 'bar'
  onDownload,
  className = '',
  height = 64,
  showDownload = true,
  chartRef = null
}, ref) => {
  const ChartComponent = type === 'line' ? Line : Bar;
  const containerRef = chartRef || ref || useRef(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!containerRef?.current) {
      toast.error('Chart not found');
      return;
    }

    try {
      setIsDownloading(true);
      
      // Capture the chart container as canvas
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Chart downloaded successfully!', {
          icon: '📊',
          duration: 3000,
        });
      });
    } catch (error) {
      console.error('Failed to download chart:', error);
      toast.error('Failed to download chart. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        {showDownload && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download chart"
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      <div className={`h-${height}`}>
        <ChartComponent data={data} options={options} />
      </div>
    </div>
  );
});

StudentPerformanceGraph.displayName = 'StudentPerformanceGraph';

export default StudentPerformanceGraph;