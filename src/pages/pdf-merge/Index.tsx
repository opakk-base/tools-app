import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  Download,
  FileIcon,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  Merge,
  X,
} from "lucide-react";

interface PDFFile {
  id: string;
  file: File;
  name: string;
  pageCount: number;
}

export default function PDFMerge() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const loadPDF = useCallback(async (file: File): Promise<PDFFile | null> => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return null;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      return {
        id: generateId(),
        file,
        name: file.name,
        pageCount,
      };
    } catch (err) {
      setError(`Failed to load ${file.name}. Invalid PDF file.`);
      return null;
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError("");
    setSuccess("");
    setOutputUrl(null);
    
    const fileArray = Array.from(files);
    const newPdfs: PDFFile[] = [];
    
    for (const file of fileArray) {
      const pdf = await loadPDF(file);
      if (pdf) {
        newPdfs.push(pdf);
      }
    }
    
    if (newPdfs.length > 0) {
      setPdfFiles((prev) => [...prev, ...newPdfs]);
    }
  }, [loadPDF]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  }, [handleFiles]);

  const removeFile = useCallback((id: string) => {
    setPdfFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setPdfFiles((prev) => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, moved);
      return newFiles;
    });
  }, []);

  const handleItemDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleItemDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleItemDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleItemDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveFile(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, moveFile]);

  const handleItemDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const clearAll = useCallback(() => {
    setPdfFiles([]);
    setOutputUrl(null);
    setError("");
    setSuccess("");
  }, []);

  const mergePDFs = useCallback(async () => {
    if (pdfFiles.length === 0) {
      setError("Please add at least one PDF file.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of pdfFiles) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const pdfBytes = await mergedPdf.save();
      
      // Create blob - use safe conversion
      const uint8Array = new Uint8Array(pdfBytes);
      const blob = new Blob([uint8Array], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(`Successfully merged ${pdfFiles.length} PDF(s) with ${mergedPdf.getPageCount()} pages total.`);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to merge PDFs.");
    } finally {
      setIsProcessing(false);
    }
  }, [pdfFiles]);

  const downloadMerged = useCallback(() => {
    if (!outputUrl) return;
    
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `merged-${Date.now()}.pdf`;
    link.click();
  }, [outputUrl]);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white/90 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
            <Merge className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">
            PDF Merger
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Merge multiple PDF files into one. Drag and drop to reorder.
          </p>
        </header>

        {/* Error / Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">{success}</div>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
              : "border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          }`}
        >
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-200" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {isDragging ? "Drop files here" : "Drag & drop PDF files here"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* File List */}
        {pdfFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <FileIcon className="w-4 h-4 text-red-500" />
                Selected Files ({pdfFiles.length})
              </h3>
              <button
                onClick={clearAll}
                className="text-sm text-red-600 dark:text-red-200 hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2">
              {pdfFiles.map((pdf, index) => (
                <div
                  key={pdf.id}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, index)}
                  onDragEnter={(e) => handleItemDragEnter(e, index)}
                  onDragOver={handleItemDragOver}
                  onDrop={(e) => handleItemDrop(e, index)}
                  onDragEnd={handleItemDragEnd}
                  className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group transition-all ${
                    draggedIndex === index ? "opacity-50 scale-95" : ""
                  } ${
                    dragOverIndex === index ? "ring-2 ring-indigo-500" : ""
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Move Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveFile(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveFile(index, index + 1)}
                      disabled={index === pdfFiles.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>

                  {/* PDF Icon */}
                  <FileIcon className="w-8 h-8 text-red-500 shrink-0" />

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {pdf.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pdf.pageCount} page{pdf.pageCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Order Number */}
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    #{index + 1}
                  </span>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(pdf.id)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-200 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                💡 Drag files to reorder. The order determines the final PDF page sequence.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={mergePDFs}
            disabled={pdfFiles.length === 0 || isProcessing}
            className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Merge className="w-5 h-5" />
                Merge {pdfFiles.length > 0 ? `(${pdfFiles.length} files)` : "PDFs"}
              </>
            )}
          </button>

          {outputUrl && (
            <button
              onClick={downloadMerged}
              className="py-3 px-6 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-white rounded-lg font-medium shadow-md shadow-emerald-200 dark:shadow-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}