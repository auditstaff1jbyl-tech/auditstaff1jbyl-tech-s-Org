import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

interface ImageZoomModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!src) return;
    setScale(1);
    setPosition({ x: 0, y: 0 });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const zoomIn = () => setScale(prev => Math.min(prev * 1.3, 5));
  const zoomOut = () => setScale(prev => Math.max(prev / 1.3, 0.5));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      id="image-zoom-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="absolute top-4 right-4 flex items-center gap-2 bg-[#121110]/90 border border-[#22201D] px-3 py-1.5 rounded-full shadow-lg z-50"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={zoomIn}
          className="p-1.5 text-gray-300 hover:text-[#C5A059] rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 text-gray-300 hover:text-[#C5A059] rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          className="p-1.5 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-700 mx-1" />
        <button
          onClick={onClose}
          className="p-1.5 text-gray-300 hover:text-red-400 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="relative max-w-full max-h-[85vh] flex items-center justify-center overflow-hidden cursor-move"
        onClick={e => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt || 'Zoomed Inspection'}
          className="max-h-[82vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform duration-75 pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>

      <div className="mt-3 text-xs text-gray-400 font-mono">
        {Math.round(scale * 100)}% • Drag to pan • Press ESC or click background to close
      </div>
    </div>
  );
};
