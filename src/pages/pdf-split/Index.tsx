import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  Upload,
  Download,
  FileIcon,
  AlertCircle,
  CheckCircle2,
  Scissors,
  Settings,
  X,
  FileText,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdf.js@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SplitRange {
  id: string;
  pages: string;
  description: string;
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
  const [pdfPreview, setPdfPreview] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [splitRanges, setSplitRanges] = useState<SplitRange[]>([
    { id: '1', pages: '', description: '' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputZipUrl, setOutputZipUrl] = useState<string | null>(null);
  const [outputPdfUrls, setOutputPdfUrls] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const loadPDF = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF to get page count (simplified - no preview for now)
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      setPdfFile({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        pageCount: pdfDoc.getPageCount(),
        arrayBuffer,
      });
      setOutputZipUrl(null);
      setOutputPdfUrls([]);
      setError("");
      setSuccess("");
    } catch (err: any) {
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const addSplitRange = () => {
    setSplitRanges([
      ...splitRanges,
      { id: generateId(), pages: '', description: '' }
    ]);
  };

  const removeSplitRange = (id: string) => {
    if (splitRanges.length > 1) {
      setSplitRanges(splitRanges.filter(range => range.id !== id));
    }
  };

  const updateSplitRange = (id: string, field: 'pages' | 'description', value: string) => {
    setSplitRanges(splitRanges.map(range =>
      range.id === id ? { ...range, [field]: value } : range
    ));
  };

  const parsePageRange = (rangeStr: string): number[] => {
    const pages: number[] = [];
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      } else {
        const pageNum = Number(part);
        if (!isNaN(pageNum)) {
          pages.push(pageNum);
        }
      }
    }
    
    return pages.filter(p => p >= 1 && p <= (pdfFile?.pageCount || 999));
  };

  const handleSplit = async () => {
    if (!pdfFile || splitRanges.length === 0) {
      setError("Please upload a PDF and specify at least one split range.");
      return;
    }

    // Validate ranges
    const hasEmptyRange = splitRanges.some(r => !r.pages.trim());
    if (hasEmptyRange) {
      setError("Please specify page ranges for all splits.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      const originalPdf = await PDFDocument.load(pdfFile.arrayBuffer);
      const splitPdfs: { name: string; blob: Blob }[] = [];

      for (const range of splitRanges) {
        if (!range.pages.trim()) continue;

        const pagesToExtract = parsePageRange(range.pages);
        if (pagesToExtract.length === 0) continue;

        // Create new PDF with selected pages
        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(
          originalPdf,
          pagesToExtract.map(p => p - 1) // Convert to 0-indexed
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
        return;
      }

      // If only 1 split, download directly as PDF
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
  useState(() => () => {
    if (outputZipUrl) URL.revokeObjectURL(outputZipUrl);
    outputPdfUrls.forEach(url => URL.revokeObjectURL(url));
  });

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
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-brand-500 dark:hover:border-brand-400 bg-gray-50 dark:bg-gray-800/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drag & drop PDF here, or click to select
          </p>
          <p className="text-sm text-muted-foreground">
            Maximum file size: 50MB
          </p>
        </div>
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
                  setPdfPreview(null);
                  setSplitRanges([{ id: '1', pages: '', description: '' }]);
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
                <div key={range.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Split #{index + 1}</h4>
                    {splitRanges.length > 1 && (
                      <button
                        onClick={() => removeSplitRange(range.id)}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Page Range
                    </label>
                    <input
                      type="text"
                      value={range.pages}
                      onChange={(e) => updateSplitRange(range.id, 'pages', e.target.value)}
                      placeholder="e.g., 1-5, 8, 10-15"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use commas for individual pages, hyphens for ranges. Total: {pdfFile.pageCount} pages
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={range.description}
                      onChange={(e) => updateSplitRange(range.id, 'description', e.target.value)}
                      placeholder="e.g., Chapter 1, Introduction"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
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
                Processing...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                Split PDF
              </>
            )}
          </button>

          {/* Download Section - ZIP */}
          {outputZipUrl && (
            <div className="border rounded-xl p-6 bg-card space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download ZIP ({splitRanges.length} files)
              </h3>
              <a
                href={outputZipUrl}
                download="split-pdfs.zip"
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-brand-500/10 border-brand-500/20"
              >
                <div className="flex items-center gap-3">
                  <FileIcon className="w-5 h-5 text-brand-500" />
                  <span className="font-medium">split-pdfs.zip</span>
                </div>
                <Download className="w-5 h-5 text-brand-500" />
              </a>
              <p className="text-sm text-muted-foreground">
                Contains {splitRanges.length} PDF files
              </p>
            </div>
          )}

          {/* Download Section - Single PDF */}
          {outputPdfUrls.length > 0 && (
            <div className="border rounded-xl p-6 bg-card space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download PDF
              </h3>
              {outputPdfUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  download={`split-${idx + 1}.pdf`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-brand-500/10 border-brand-500/20"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-5 h-5 text-brand-500" />
                    <span className="font-medium">split-{idx + 1}.pdf</span>
                  </div>
                  <Download className="w-5 h-5 text-brand-500" />
                </a>
              ))}
            </div>
          )}
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
