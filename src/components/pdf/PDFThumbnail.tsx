import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFThumbnailProps {
  file: File;
  pageNumber: number;
  scale?: number;
  selected?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  showPageNumber?: boolean;
  className?: string;
}

export default function PDFThumbnail({
  file,
  pageNumber,
  scale = 0.3,
  selected = false,
  onClick,
  onDragStart,
  showPageNumber = true,
  className = "",
}: PDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const renderThumbnail = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || !mounted) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        if (mounted) setLoaded(true);
      } catch {
        if (mounted) setError(true);
      }
    };

    renderThumbnail();

    return () => {
      mounted = false;
    };
  }, [file, pageNumber, scale]);

  return (
    <div
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={`
        relative flex-shrink-0 cursor-pointer group
        transition-all duration-200
        ${selected 
          ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800" 
          : "hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600"
        }
        ${className}
      `}
    >
      <div className="relative bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm">
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <span className="text-xs text-gray-400">Error</span>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="block"
          style={{ opacity: loaded ? 1 : 0 }}
        />
        
        {showPageNumber && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center">
            {pageNumber}
          </div>
        )}
      </div>
    </div>
  );
}
