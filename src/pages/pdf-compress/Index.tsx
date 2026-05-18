import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import {
  Upload,
  Download,
  FileIcon,
  AlertCircle,
  CheckCircle2,
  Minimize2,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFInfo {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  pageCount: number;
}

interface Progress {
  current: number;
  total: number;
}

export default function PDFCompress() {
  const [pdfFile, setPdfFile] = useState<PDFInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [_, setOutputSize] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [progress, setProgress] = useState<Progress | null>(null);
  
  const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputUrlRef = useRef<string | null>(null);
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const loadPDF = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      setPdfFile({
        id: generateId(),
        file,
        name: file.name,
        originalSize: file.size,
        pageCount,
      });
      setOutputUrl(null);
      setError("");
      setSuccess("");
    } catch (err) {
      setError("Failed to load PDF. Invalid file.");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      loadPDF(e.target.files[0]);
      e.target.value = "";
    }
  }, [loadPDF]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      loadPDF(e.dataTransfer.files[0]);
    }
  }, [loadPDF]);

  const compressPDF = useCallback(async () => {
    if (!pdfFile) return;

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setProgress(null);

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      
      const compressionSettings = {
        low: { scale: 2.0, quality: 0.92 },
        medium: { scale: 1.5, quality: 0.75 },
        high: { scale: 1.0, quality: 0.55 },
      };
      const { scale, quality } = compressionSettings[compressionLevel];

      const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const totalPages = pdfJsDoc.numPages;
      setProgress({ current: 0, total: totalPages });

      const firstPageForInit = await pdfJsDoc.getPage(1);
      const firstViewportBase = firstPageForInit.getViewport({ scale: 1 });
      const firstOrientation = firstViewportBase.width > firstViewportBase.height ? "landscape" : "portrait";

      const pdf = new jsPDF({
        unit: "pt",
        format: [firstViewportBase.width, firstViewportBase.height],
        orientation: firstOrientation,
      });

      for (let i = 1; i <= totalPages; i++) {
        setProgress({ current: i, total: totalPages });
        
        const page = await pdfJsDoc.getPage(i);
        const viewportBase = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale });
        
        const widthPt = viewportBase.width;
        const heightPt = viewportBase.height;
        const orientation = widthPt > heightPt ? "landscape" : "portrait";

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          canvas.width = 0;
          canvas.height = 0;
          continue;
        }

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        
        canvas.width = 0;
        canvas.height = 0;

        if (i > 1) {
          pdf.addPage([widthPt, heightPt], orientation);
        }
        
        pdf.addImage(jpegDataUrl, "JPEG", 0, 0, widthPt, heightPt, undefined, "FAST");
      }

      const rasterBlob = pdf.output("blob");
      
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);
      const baselineBytes = await pdfLibDoc.save();
      const baselineBlob = new Blob([new Uint8Array(baselineBytes).buffer], { type: "application/pdf" });

      let finalBlob: Blob;
      let usedRaster = false;
      
      if (rasterBlob.size < baselineBlob.size) {
        finalBlob = rasterBlob;
        usedRaster = true;
      } else {
        finalBlob = baselineBlob;
        usedRaster = false;
      }

      const url = URL.createObjectURL(finalBlob);
      outputUrlRef.current = url;
      setOutputUrl(url);
      setOutputSize(finalBlob.size);
      
      const savedSize = finalBlob.size;
      const originalSize = pdfFile.originalSize;
      const ratio = ((originalSize - savedSize) / originalSize * 100).toFixed(1);
      
      if (savedSize < originalSize) {
        const method = usedRaster ? "Rasterized compression" : "Optimized structure";
        setSuccess(`${method}: ${(originalSize / 1024).toFixed(1)} KB → ${(savedSize / 1024).toFixed(1)} KB (${ratio}% smaller)`);
      } else {
        setSuccess(`File already optimal. Size: ${(savedSize / 1024).toFixed(1)} KB`);
      }
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to compress PDF.");
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [pdfFile, compressionLevel]);

  const downloadCompressed = useCallback(() => {
    if (!outputUrl || !pdfFile) return;
    
    const link = document.createElement("a");
    link.href = outputUrl;
    const baseName = pdfFile.name.replace(/\.pdf$/i, "");
    link.download = `${baseName}-compressed.pdf`;
    link.click();
  }, [outputUrl, pdfFile]);

  const resetAll = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setPdfFile(null);
    setOutputUrl(null);
    setOutputSize(0);
    setError("");
    setSuccess("");
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
          <Minimize2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">
          PDF Compressor
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Compress PDF files to reduce file size
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

        {/* Upload Section */}
        {!pdfFile && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-200" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Click to upload a PDF
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Drag and drop or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* File Info & Settings */}
        {pdfFile && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileIcon className="w-10 h-10 text-red-500" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{pdfFile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {pdfFile.pageCount} page{pdfFile.pageCount !== 1 ? "s" : ""} • {formatSize(pdfFile.originalSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetAll}
                  className="text-sm text-red-600 dark:text-red-200 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Compression Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                Compression Level
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "low", label: "Low", desc: "Best quality" },
                  { value: "medium", label: "Medium", desc: "Balanced" },
                  { value: "high", label: "High", desc: "Smallest size" },
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setCompressionLevel(level.value as "low" | "medium" | "high")}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      compressionLevel === level.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  ⚠️ Note: Compressed PDF converts text to images. Text won&apos;t be selectable, searchable, or copyable in the result.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={compressPDF}
                disabled={isProcessing}
                className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing && progress ? (
                  <>Compressing page {progress.current} of {progress.total}...</>
                ) : isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Minimize2 className="w-5 h-5" />
                    Compress PDF
                  </>
                )}
              </button>

              {outputUrl && (
                <button
                  onClick={downloadCompressed}
                  className="py-3 px-6 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-white rounded-lg font-medium shadow-md shadow-emerald-200 dark:shadow-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );
}