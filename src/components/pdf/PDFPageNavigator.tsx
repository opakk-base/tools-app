import { useRef, useCallback } from "react";
import PDFThumbnail from "./PDFThumbnail";

interface PDFPageNavigatorProps {
  file: File;
  pageCount: number;
  currentPage: number;
  onPageSelect: (pageNumber: number) => void;
  selectedPages?: Set<number>;
  onSelectionChange?: (pages: Set<number>) => void;
  multiSelect?: boolean;
  className?: string;
}

export default function PDFPageNavigator({
  file,
  pageCount,
  currentPage,
  onPageSelect,
  selectedPages = new Set(),
  onSelectionChange,
  multiSelect = false,
  className = "",
}: PDFPageNavigatorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleThumbnailClick = useCallback((pageNumber: number) => {
    if (multiSelect && onSelectionChange) {
      const newSelection = new Set(selectedPages);
      if (newSelection.has(pageNumber)) {
        newSelection.delete(pageNumber);
      } else {
        newSelection.add(pageNumber);
      }
      onSelectionChange(newSelection);
    } else {
      onPageSelect(pageNumber);
    }
  }, [multiSelect, selectedPages, onSelectionChange, onPageSelect]);

  const handleScroll = useCallback((direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    
    const scrollAmount = 150;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  if (pageCount === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => handleScroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto py-2 px-8 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
          <PDFThumbnail
            key={pageNum}
            file={file}
            pageNumber={pageNum}
            scale={0.2}
            selected={multiSelect ? selectedPages.has(pageNum) : currentPage === pageNum}
            onClick={() => handleThumbnailClick(pageNum)}
          />
        ))}
      </div>

      <button
        onClick={() => handleScroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
