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
  Download,
} from "lucide-react";
import { FileUpload } from "./FileUpload";

interface PDFInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}

type SplitMode = "extract" | "split-each";

export default function PDFSplit() {
  const [pdfFile, setPdfFile] = useState<PDFInfo | null>(null);
  const [mode, setMode] = useState<SplitMode>("extract");
  const [fromPage, setFromPage] = useState<number>(1);
  const [toPage, setToPage] = useState<number>(1);
  const [description, setDescription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"pdf" | "zip">("pdf");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

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
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      setPdfFile({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        pageCount,
        arrayBuffer,
      });
      setFromPage(1);
      setToPage(pageCount);
      setDescription("");
      setOutputUrl(null);
      setError("");
      setSuccess("");
      setValidationError("");
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes("encrypted")) {
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

  const validateRange = (): boolean => {
    if (!pdfFile) return false;
    if (!Number.isInteger(fromPage) || !Number.isInteger(toPage)) {
      setValidationError("Pages must be integers.");
      return false;
    }
    if (fromPage < 1 || toPage > pdfFile.pageCount) {
      setValidationError(`Pages must be between 1 and ${pdfFile.pageCount}.`);
      return false;
    }
    if (fromPage > toPage) {
      setValidationError("'From' page must be less than or equal to 'To' page.");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleSplit = async () => {
    if (!pdfFile) {
      setError("Please upload a PDF first.");
      return;
    }
    if (!validateRange()) return;

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setProgress("");
    setOutputUrl(null);

    try {
      const originalPdf = await PDFDocument.load(pdfFile.arrayBuffer);

      if (mode === "extract") {
        const pageIndices: number[] = [];
        for (let i = fromPage; i <= toPage; i++) pageIndices.push(i - 1);

        const newPdfDoc = await PDFDocument.create();
        const copiedPages = await newPdfDoc.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((p) => newPdfDoc.addPage(p));

        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setOutputType("pdf");
        setSuccess(`Extracted ${pageIndices.length} page(s) into one PDF.`);
      } else {
        const zip = new JSZip();
        const padWidth = String(pdfFile.pageCount).length;
        const prefix = description.trim() || "page";
        const total = toPage - fromPage + 1;
        let processed = 0;

        for (let i = fromPage; i <= toPage; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(originalPdf, [i - 1]);
          newPdf.addPage(copiedPage);
          const bytes = await newPdf.save();
          const padded = String(i).padStart(padWidth, "0");
          zip.file(`${prefix}-${padded}.pdf`, bytes);

          processed++;
          setProgress(`Processing page ${processed} of ${total}...`);
          await new Promise((r) => setTimeout(r, 0));
        }

        setProgress("Generating ZIP...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setOutputUrl(url);
        setOutputType("zip");
        setSuccess(`Split into ${total} separate PDF file(s) in a ZIP.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Failed to split PDF: " + message);
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const pageExtractCount = Math.max(0, toPage - fromPage + 1);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
          <Scissors className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">Split PDF</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Extract a range as one PDF, or split each page into separate files
        </p>
      </header>

      {!pdfFile ? (
        <FileUpload
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FileIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{pdfFile.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(pdfFile.size)} - {pdfFile.pageCount} pages
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPdfFile(null);
                  setFromPage(1);
                  setToPage(1);
                  setDescription("");
                  setOutputUrl(null);
                  setError("");
                  setSuccess("");
                  setValidationError("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Total Pages: {pdfFile.pageCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-lg mb-4">Output Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("extract")}
                className={`p-4 rounded-lg text-left transition-all ${
                  mode === "extract"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <div className="font-medium">Extract as one PDF</div>
                <div className="text-xs mt-1 opacity-80">
                  Output a single PDF containing all selected pages
                </div>
              </button>
              <button
                onClick={() => setMode("split-each")}
                className={`p-4 rounded-lg text-left transition-all ${
                  mode === "split-each"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <div className="font-medium">Split each page</div>
                <div className="text-xs mt-1 opacity-80">
                  Output a ZIP with one PDF file per page
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-lg">Page Range</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Page</label>
                <input
                  type="number"
                  min={1}
                  max={pdfFile.pageCount}
                  value={fromPage}
                  onChange={(e) => {
                    setFromPage(Number(e.target.value));
                    setValidationError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Page</label>
                <input
                  type="number"
                  min={1}
                  max={pdfFile.pageCount}
                  value={toPage}
                  onChange={(e) => {
                    setToPage(Number(e.target.value));
                    setValidationError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Chapter 1, Introduction"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {mode === "extract" ? (
                  <>Used as the output filename. Defaults to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">split-{fromPage}-{toPage}.pdf</code>.</>
                ) : (
                  <>Used as the filename prefix inside the ZIP. Defaults to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">page-N.pdf</code>.</>
                )}
              </p>
            </div>

            {validationError ? (
              <p className="text-sm text-red-500 mt-3">{validationError}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {mode === "extract"
                  ? <>Will extract <span className="font-medium text-gray-700 dark:text-gray-200">{pageExtractCount}</span> page(s) into one PDF.</>
                  : <>Will produce <span className="font-medium text-gray-700 dark:text-gray-200">{pageExtractCount}</span> separate PDF file(s) in a ZIP.</>
                }
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-900 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-900 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">{success}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleSplit}
            disabled={isProcessing}
            className="w-full bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {progress || "Processing..."}
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                {mode === "extract" ? "Extract PDF" : "Split PDF"}
              </>
            )}
          </button>

          {outputUrl && (
            <a
              href={outputUrl}
              download={
                outputType === "pdf"
                  ? (description.trim() || `split-${fromPage}-${toPage}`) + ".pdf"
                  : (description.trim() || "split") + `-${fromPage}-${toPage}.zip`
              }
              className="w-full bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {outputType === "pdf"
                ? "Download PDF"
                : `Download ZIP (${pageExtractCount} files)`}
            </a>
          )}
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-lg mb-4">How to use:</h3>
        <ol className="space-y-2 text-gray-500 dark:text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Upload your PDF file</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Choose output mode: extract as one PDF or split each page into separate files</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Set the "From" and "To" page numbers (default: full document)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Optionally add a description for filename</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">5.</span>
            <span>Click "Split PDF" and download the result</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
