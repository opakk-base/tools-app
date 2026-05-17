import { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";

interface PDFUploadZoneProps {
  onFileSelect: (file: File) => void;
  maxSize?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function PDFUploadZone({
  onFileSelect,
  maxSize = 10 * 1024 * 1024,
  label = "Drop PDF here or click to upload",
  className = "",
  disabled = false,
}: PDFUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (!disabled && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      if (file.size <= maxSize) {
        onFileSelect(file);
      }
    }
  }, [disabled, maxSize, onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf" && file.size <= maxSize) {
      onFileSelect(file);
    }
    e.target.value = "";
  }, [maxSize, onFileSelect]);

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragging 
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
          : "border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className={`
          p-4 rounded-full 
          ${isDragging 
            ? "bg-indigo-100 dark:bg-indigo-800" 
            : "bg-gray-100 dark:bg-gray-700"
          }
        `}>
          <Upload className={`w-8 h-8 ${isDragging ? "text-indigo-600" : "text-gray-400"}`} />
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {label}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>
      </div>
    </div>
  );
}
