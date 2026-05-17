import { Upload } from "lucide-react";
import type { RefObject } from "react";

interface FileUploadProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export function FileUpload({ fileInputRef, onFileSelect, onDrop, onDragOver }: FileUploadProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-indigo-600 dark:hover:border-indigo-400 bg-gray-50 dark:bg-gray-800/50"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={onFileSelect}
        className="hidden"
      />
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-lg font-medium mb-2">
        Drag & drop PDF here, or click to select
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Maximum file size: 50MB
      </p>
    </div>
  );
}
