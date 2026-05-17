import { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  FilePlus,
  Download,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  X,
  ArrowRight,
} from "lucide-react";
import PDFUploadZone from "../../components/pdf/PDFUploadZone";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface PDFInfo {
  file: File;
  pageCount: number;
  name: string;
}

interface PageItem {
  id: string;
  source: "source" | "target";
  pageNumber: number;
  fileName: string;
}

export default function PDFEmbed() {
  const [sourcePDF, setSourcePDF] = useState<PDFInfo | null>(null);
  const [targetPDF, setTargetPDF] = useState<PDFInfo | null>(null);
  const [selectedSourcePages, setSelectedSourcePages] = useState<Set<number>>(new Set());
  const [insertPosition, setInsertPosition] = useState<number>(-1);
  const [pageOrder, setPageOrder] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const draggedItem = useRef<string | null>(null);

  const loadPDFInfo = async (file: File): Promise<PDFInfo> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return {
      file,
      pageCount: pdf.numPages,
      name: file.name,
    };
  };

  const handleSourceUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    try {
      const info = await loadPDFInfo(file);
      setSourcePDF(info);
      setSelectedSourcePages(new Set());
      setError("");
      setSuccess("");
      setOutputUrl(null);
      updatePageOrder(info, targetPDF, new Set(), insertPosition);
    } catch {
      setError("Failed to load source PDF.");
    }
  };

  const handleTargetUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    try {
      const info = await loadPDFInfo(file);
      setTargetPDF(info);
      setInsertPosition(-1);
      setError("");
      setSuccess("");
      setOutputUrl(null);
      updatePageOrder(sourcePDF, info, selectedSourcePages, -1);
    } catch {
      setError("Failed to load target PDF.");
    }
  };

  const updatePageOrder = (
    src: PDFInfo | null,
    tgt: PDFInfo | null,
    selected: Set<number>,
    position: number
  ) => {
    if (!tgt) {
      setPageOrder([]);
      return;
    }

    const items: PageItem[] = [];

    for (let i = 1; i <= tgt.pageCount; i++) {
      items.push({
        id: `target-${i}`,
        source: "target",
        pageNumber: i,
        fileName: tgt.name,
      });
    }

    if (src && selected.size > 0) {
      const sourceItems: PageItem[] = Array.from(selected)
        .sort((a, b) => a - b)
        .map((pageNum) => ({
          id: `source-${pageNum}`,
          source: "source",
          pageNumber: pageNum,
          fileName: src.name,
        }));

      if (position === 0) {
        setPageOrder([...sourceItems, ...items]);
      } else if (position === -1 || position >= items.length) {
        setPageOrder([...items, ...sourceItems]);
      } else {
        const before = items.slice(0, position);
        const after = items.slice(position);
        setPageOrder([...before, ...sourceItems, ...after]);
      }
    } else {
      setPageOrder(items);
    }
  };

  const toggleSourcePage = (pageNum: number) => {
    const newSelected = new Set(selectedSourcePages);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else {
      newSelected.add(pageNum);
    }
    setSelectedSourcePages(newSelected);
    updatePageOrder(sourcePDF, targetPDF, newSelected, insertPosition);
  };

  const handleInsertPositionChange = (position: number) => {
    setInsertPosition(position);
    updatePageOrder(sourcePDF, targetPDF, selectedSourcePages, position);
  };

  const handleDragStart = (id: string) => {
    draggedItem.current = id;
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem.current || draggedItem.current === targetId) return;

    const currentIndex = pageOrder.findIndex((item) => item.id === draggedItem.current);
    const targetIndex = pageOrder.findIndex((item) => item.id === targetId);

    if (currentIndex === -1 || targetIndex === -1) return;

    const newOrder = [...pageOrder];
    const [removed] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    setPageOrder(newOrder);
  };

  const handleDragEnd = () => {
    draggedItem.current = null;
  };

  const embedPDFs = async () => {
    if (!sourcePDF || !targetPDF || selectedSourcePages.size === 0) {
      setError("Please select pages from source PDF and set insert position.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      const sourceArrayBuffer = await sourcePDF.file.arrayBuffer();
      const targetArrayBuffer = await targetPDF.file.arrayBuffer();

      const sourceDoc = await PDFDocument.load(sourceArrayBuffer);
      const targetDoc = await PDFDocument.load(targetArrayBuffer);
      const outputDoc = await PDFDocument.create();

      for (const item of pageOrder) {
        if (item.source === "target") {
          const [copiedPage] = await outputDoc.copyPages(targetDoc, [item.pageNumber - 1]);
          outputDoc.addPage(copiedPage);
        } else {
          const [copiedPage] = await outputDoc.copyPages(sourceDoc, [item.pageNumber - 1]);
          outputDoc.addPage(copiedPage);
        }
      }

      const pdfBytes = await outputDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setSuccess(`Successfully embedded ${selectedSourcePages.size} page(s) into target PDF.`);
    } catch {
      setError("Failed to embed PDFs.");
    }

    setIsProcessing(false);
  };

  const downloadMerged = () => {
    if (!outputUrl || !targetPDF) return;
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `embedded-${targetPDF.name}`;
    link.click();
  };

  const reset = () => {
    setSourcePDF(null);
    setTargetPDF(null);
    setSelectedSourcePages(new Set());
    setInsertPosition(-1);
    setPageOrder([]);
    setOutputUrl(null);
    setError("");
    setSuccess("");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
          <FilePlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">
          PDF Embed
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Insert pages from one PDF into another with drag-to-reorder
        </p>
      </header>

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

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Source PDF (Pages to Insert)</h3>
          {!sourcePDF ? (
            <PDFUploadZone onFileSelect={handleSourceUpload} label="Upload source PDF" />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{sourcePDF.name}</p>
                  <p className="text-sm text-gray-500">{sourcePDF.pageCount} pages</p>
                </div>
                <button onClick={() => { setSourcePDF(null); setSelectedSourcePages(new Set()); }} className="text-red-500 hover:text-red-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select pages to insert:</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: sourcePDF.pageCount }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => toggleSourcePage(pageNum)}
                    className={`
                      w-10 h-10 rounded font-medium transition-all
                      ${selectedSourcePages.has(pageNum)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Target PDF (Destination)</h3>
          {!targetPDF ? (
            <PDFUploadZone onFileSelect={handleTargetUpload} label="Upload target PDF" />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{targetPDF.name}</p>
                  <p className="text-sm text-gray-500">{targetPDF.pageCount} pages</p>
                </div>
                <button onClick={() => { setTargetPDF(null); setInsertPosition(-1); }} className="text-red-500 hover:text-red-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Insert position:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleInsertPositionChange(0)}
                  className={`
                    px-3 py-2 rounded text-sm font-medium transition-all
                    ${insertPosition === 0
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                    }
                  `}
                >
                  At beginning
                </button>
                {Array.from({ length: targetPDF.pageCount + 1 }, (_, i) => i).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => handleInsertPositionChange(pos === targetPDF.pageCount ? -1 : pos)}
                    className={`
                      px-3 py-2 rounded text-sm font-medium transition-all
                      ${(pos === targetPDF.pageCount ? -1 : pos) === insertPosition
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                      }
                    `}
                  >
                    {pos === targetPDF.pageCount ? "At end" : `After page ${pos}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {sourcePDF && targetPDF && pageOrder.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mt-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Preview: Final Page Order (drag to reorder)
          </h3>
          <div className="flex flex-wrap gap-2">
            {pageOrder.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-1 px-3 py-2 rounded-lg cursor-move transition-all
                  ${item.source === "source"
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border-2 border-indigo-300 dark:border-indigo-700"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  }
                `}
              >
                <GripVertical className="w-4 h-4 opacity-50" />
                <span className="text-sm font-medium">
                  {item.source === "source" ? "S" : "T"}{item.pageNumber}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            S = Source PDF, T = Target PDF
          </p>
        </div>
      )}

      {sourcePDF && targetPDF && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={embedPDFs}
            disabled={isProcessing || selectedSourcePages.size === 0}
            className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Embed {selectedSourcePages.size} Page(s)
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

          <button
            onClick={reset}
            className="py-3 px-6 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-all"
          >
            Reset
          </button>
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">How to use:</h3>
        <ol className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
          <li>1. Upload source PDF (pages you want to insert)</li>
          <li>2. Upload target PDF (destination)</li>
          <li>3. Select pages from source PDF to insert</li>
          <li>4. Choose where to insert in target PDF</li>
          <li>5. Drag pages in preview to reorder</li>
          <li>6. Click "Embed" to create final PDF</li>
        </ol>
      </div>
    </div>
  );
}
