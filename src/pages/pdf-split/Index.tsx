import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  FileIcon,
  AlertCircle,
  CheckCircle2,
  Scissors,
  Settings,
  X,
  FileText,
} from "lucide-react";
import { FileUpload } from "./FileUpload";
import { SplitRangeInput } from "./SplitRangeInput";
import { DownloadSection } from "./DownloadSection";
import { usePdfThumbnails } from "./hooks/usePdfThumbnails";

interface SplitRange {
  id: string;
  pages: string;
  description: string;
  validationError?: string;
}

interface PDFInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}

export default function PDFSplit() {
  const [pdfFile, setPdfFile] = useState<PDFInfo | null>(null);
  const [splitRanges, setSplitRanges] = useState<SplitRange[]>([]);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>("");
  const [outputZipUrl, setOutputZipUrl] = useState<string | null>(null);
  const [outputPdfUrls, setOutputPdfUrls] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  usePdfThumbnails(
    pdfFile?.arrayBuffer || null,
    pdfFile?.pageCount || 0,
    150
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const loadPDF = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 50MB limit. Your file is ${formatFileSize(file.size)}.`);
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfDoc = await PDFDocument.load(arrayBuffer, { 
        ignoreEncryption: true 
      });

      const pageCount = pdfDoc.getPageCount();
      
      const defaultRanges: SplitRange[] = [];
      for (let i = 1; i <= pageCount; i++) {
        defaultRanges.push({
          id: generateId(),
          pages: i.toString(),
          description: ""
        });
      }
      
      setPdfFile({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        pageCount,
        arrayBuffer,
      });
      setSplitRanges(defaultRanges);
      setSelectedRangeId(defaultRanges[0]?.id || null);
      setOutputZipUrl(null);
      setOutputPdfUrls([]);
      setError("");
      setSuccess("");
    } catch (err: any) {
      if (err.message?.includes("encrypted")) {
        setError("This PDF is password-protected. Please decrypt it first.");
      } else {
        setError("Failed to load PDF. The file may be corrupted or invalid.");
      }
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const addSplitRange = () => {
    const newRange = { id: generateId(), pages: "", description: "" };
    setSplitRanges([...splitRanges, newRange]);
    setSelectedRangeId(newRange.id);
  };

  const removeSplitRange = (id: string) => {
    if (splitRanges.length > 1) {
      const newRanges = splitRanges.filter(range => range.id !== id);
      setSplitRanges(newRanges);
      if (selectedRangeId === id) {
        setSelectedRangeId(newRanges[0]?.id || null);
      }
    }
  };

  const updateSplitRange = (id: string, field: 'pages' | 'description', value: string) => {
    setSplitRanges(splitRanges.map(range =>
      range.id === id ? { ...range, [field]: value } : range
    ));
  };

  const parsePageRange = (rangeStr: string): { pages: number[]; invalidPages: number[] } => {
    const pages: number[] = [];
    const invalidPages: number[] = [];
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= (pdfFile?.pageCount || 0)) {
              pages.push(i);
            } else {
              invalidPages.push(i);
            }
          }
        }
      } else {
        const pageNum = Number(part);
        if (!isNaN(pageNum)) {
          if (pageNum >= 1 && pageNum <= (pdfFile?.pageCount || 0)) {
            pages.push(pageNum);
          } else {
            invalidPages.push(pageNum);
          }
        }
      }
    }
    
    return { pages: [...new Set(pages)], invalidPages: [...new Set(invalidPages)] };
  };

  const validateSplitRanges = (): boolean => {
    const allPages: number[] = [];
    let hasError = false;
    
    const validatedRanges = splitRanges.map(range => {
      if (!range.pages.trim()) {
        return { ...range, validationError: undefined };
      }
      
      const { pages, invalidPages } = parsePageRange(range.pages);
      
      if (invalidPages.length > 0) {
        hasError = true;
        return {
          ...range,
          validationError: `Invalid pages: ${invalidPages.join(', ')}. PDF has ${pdfFile?.pageCount} pages.`
        };
      }
      
      if (pages.length === 0) {
        hasError = true;
        return { ...range, validationError: "No valid pages specified." };
      }
      
      const duplicates = pages.filter(p => allPages.includes(p));
      if (duplicates.length > 0) {
        hasError = true;
        return {
          ...range,
          validationError: `Pages ${duplicates.join(', ')} already used in another split.`
        };
      }
      
      allPages.push(...pages);
      return { ...range, validationError: undefined, pageCount: pages.length };
    });
    
    setSplitRanges(validatedRanges);
    return !hasError;
  };

  const handleSplit = async () => {
    if (!pdfFile || splitRanges.length === 0) {
      setError("Please upload a PDF and specify at least one split range.");
      return;
    }

    const hasEmptyRange = splitRanges.some(r => !r.pages.trim());
    if (hasEmptyRange) {
      setError("Please specify page ranges for all splits.");
      return;
    }

    if (!validateSplitRanges()) {
      setError("Please fix the validation errors above.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setProcessingProgress("Loading PDF...");

    try {
      const originalPdf = await PDFDocument.load(pdfFile.arrayBuffer);
      const splitPdfs: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < splitRanges.length; i++) {
        const range = splitRanges[i];
        if (!range.pages.trim()) continue;

        setProcessingProgress(`Processing split ${i + 1} of ${splitRanges.length}...`);

        const { pages: pagesToExtract } = parsePageRange(range.pages);
        if (pagesToExtract.length === 0) continue;

        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(
          originalPdf,
          pagesToExtract.map(p => p - 1)
        );
        
        copiedPages.forEach(page => newPdfDoc.addPage(page));
        
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        
        const fileName = range.description 
          ? `${range.description}.pdf`
          : `split-${splitPdfs.length + 1}.pdf`;
        
        splitPdfs.push({ name: fileName, blob });
      }

      if (splitPdfs.length === 0) {
        setError("No valid pages to split.");
        setIsProcessing(false);
        setProcessingProgress("");
        return;
      }

      setProcessingProgress("Generating output...");

      if (splitPdfs.length === 1) {
        const url = URL.createObjectURL(splitPdfs[0].blob);
        setOutputPdfUrls([url]);
        setSuccess(`PDF split successfully! Download your file below.`);
      } else {
        // Multiple splits - create ZIP
        const zip = new JSZip();
        
        // Add each PDF to ZIP
        splitPdfs.forEach(pdf => {
          zip.file(pdf.name, pdf.blob);
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        setOutputZipUrl(zipUrl);
        setSuccess(`PDF split into ${splitPdfs.length} files! Download ZIP below.`);
      }
    } catch (err: any) {
      setError("Failed to split PDF: " + err.message);
    } finally {
      setIsProcessing(false);
      setProcessingProgress("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (outputZipUrl) URL.revokeObjectURL(outputZipUrl);
      outputPdfUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [outputZipUrl, outputPdfUrls]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-500/10 rounded-lg">
            <Scissors className="w-6 h-6 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold">Split PDF</h1>
        </div>
        <p className="text-muted-foreground">
          Split your PDF into multiple files by page ranges
        </p>
      </div>

      {/* Upload Area */}
      {!pdfFile ? (
        <FileUpload
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      ) : (
        <div className="space-y-6">
          {/* File Info Card */}
          <div className="border rounded-xl p-6 bg-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/10 rounded-lg">
                  <FileIcon className="w-6 h-6 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{pdfFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(pdfFile.size)} • {pdfFile.pageCount} pages
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPdfFile(null);
                  setSplitRanges([]);
                  setSelectedRangeId(null);
                  setOutputZipUrl(null);
                  setOutputPdfUrls([]);
                  setError("");
                  setSuccess("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Page Count Info */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Total Pages: {pdfFile.pageCount}</span>
              </div>
            </div>
          </div>

          {/* Split Ranges */}
          <div className="border rounded-xl p-6 bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-lg">Split Ranges</h3>
            </div>
            
            <div className="space-y-4">
              {splitRanges.map((range, index) => (
                <SplitRangeInput
                  key={range.id}
                  range={range}
                  index={index}
                  totalPages={pdfFile.pageCount}
                  canRemove={splitRanges.length > 1}
                  isSelected={selectedRangeId === range.id}
                  onSelect={setSelectedRangeId}
                  onUpdate={updateSplitRange}
                  onRemove={removeSplitRange}
                />
              ))}

              <button
                onClick={addSplitRange}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 text-muted-foreground hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                + Add Another Split Range
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="border border-red-200 dark:border-red-800 rounded-xl p-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="border border-green-200 dark:border-green-800 rounded-xl p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Success</p>
                  <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Split Button */}
          <button
            onClick={handleSplit}
            disabled={isProcessing}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {processingProgress || "Processing..."}
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                Split PDF
              </>
            )}
          </button>

          <DownloadSection
            outputZipUrl={outputZipUrl}
            outputPdfUrls={outputPdfUrls}
            splitCount={splitRanges.length}
          />
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 border rounded-xl p-6 bg-card">
        <h3 className="font-semibold text-lg mb-4">How to use:</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Upload your PDF file</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Specify page ranges for each split (e.g., 1-5, 8, 10-15)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Add descriptions to name your split files (optional)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Click "Split PDF" - single split downloads as PDF, multiple as ZIP</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
