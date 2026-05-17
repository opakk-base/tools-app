import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Edit3,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  MousePointer,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";
import PDFUploadZone from "../../components/pdf/PDFUploadZone";
import type {
  Annotation,
  ToolType,
  TextAnnotation,
  ImageAnnotation,
  ShapeAnnotation,
} from "./types";
import {
  FONT_FAMILIES,
  DEFAULT_TEXT_PROPS,
  DEFAULT_SHAPE_PROPS,
} from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ANNOTATION_Z_INDEX = 1000;

export default function PDFEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [selectedTool, setSelectedTool] = useState<ToolType>("select");
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [history, setHistory] = useState<Record<number, Annotation[][]>>({});
  const [historyIndex, setHistoryIndex] = useState<Record<number, number>>({});
  
  const [textProps, setTextProps] = useState(DEFAULT_TEXT_PROPS);
  const [shapeProps, setShapeProps] = useState(DEFAULT_SHAPE_PROPS);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const viewportRef = useRef<{ width: number; height: number; scale: number } | null>(null);
  
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeHandle = useRef<string>("");
  const annotationStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const loadPDF = useCallback(async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setError("");
    setSuccess("");
    setFile(selectedFile);
    setAnnotations({});
    setHistory({});
    setHistoryIndex({});

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setPageCount(pdf.numPages);
      setCurrentPage(1);
    } catch {
      setError("Failed to load PDF.");
    }
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    const pdf = pdfDocRef.current;
    const page = await pdf.getPage(pageNumber);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    viewportRef.current = { width: viewport.width, height: viewport.height, scale };

    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;
  }, []);

  useEffect(() => {
    if (pdfDocRef.current && pageCount > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage, pageCount]);

  const getCurrentPageAnnotations = (): Annotation[] => {
    return annotations[currentPage] || [];
  };

  const saveToHistory = useCallback((page: number, annots: Annotation[]) => {
    setHistory((prev) => {
      const pageHistory = prev[page] || [];
      const newHistory = [...pageHistory.slice(0, (historyIndex[page] || 0) + 1), annots];
      return { ...prev, [page]: newHistory };
    });
    setHistoryIndex((prev) => ({ ...prev, [page]: (historyIndex[page] || -1) + 1 }));
  }, [historyIndex]);

  const addAnnotation = (annotation: Annotation) => {
    const pageAnnotations = [...getCurrentPageAnnotations(), annotation];
    setAnnotations((prev) => ({ ...prev, [currentPage]: pageAnnotations }));
    saveToHistory(currentPage, pageAnnotations);
    setSelectedAnnotation(annotation.id);
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    const pageAnnotations = getCurrentPageAnnotations().map((a) =>
      a.id === id ? { ...a, ...updates } as Annotation : a
    );
    setAnnotations((prev) => ({ ...prev, [currentPage]: pageAnnotations }));
  };

  const deleteAnnotation = (id: string) => {
    const pageAnnotations = getCurrentPageAnnotations().filter((a) => a.id !== id);
    setAnnotations((prev) => ({ ...prev, [currentPage]: pageAnnotations }));
    saveToHistory(currentPage, pageAnnotations);
    setSelectedAnnotation(null);
  };

  const undo = () => {
    const idx = historyIndex[currentPage] || 0;
    if (idx <= 0) return;
    
    const newIdx = idx - 1;
    setHistoryIndex((prev) => ({ ...prev, [currentPage]: newIdx }));
    setAnnotations((prev) => ({
      ...prev,
      [currentPage]: history[currentPage]?.[newIdx] || [],
    }));
  };

  const redo = () => {
    const idx = historyIndex[currentPage] || -1;
    const pageHistory = history[currentPage] || [];
    if (idx >= pageHistory.length - 1) return;
    
    const newIdx = idx + 1;
    setHistoryIndex((prev) => ({ ...prev, [currentPage]: newIdx }));
    setAnnotations((prev) => ({
      ...prev,
      [currentPage]: pageHistory[newIdx],
    }));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!overlayRef.current || !viewportRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === "select") {
      const clicked = getCurrentPageAnnotations().find((a) => {
        return x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height;
      });
      setSelectedAnnotation(clicked?.id || null);
      return;
    }

    if (selectedTool === "text") {
      const annotation: TextAnnotation = {
        id: generateId(),
        type: "text",
        x,
        y,
        width: 200,
        height: 40,
        rotation: 0,
        ...textProps,
      };
      addAnnotation(annotation);
      setSelectedTool("select");
      return;
    }

    if (selectedTool === "image") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target?.result as string;
          const annotation: ImageAnnotation = {
            id: generateId(),
            type: "image",
            x,
            y,
            width: 200,
            height: 150,
            rotation: 0,
            imageData,
            opacity: 1,
          };
          addAnnotation(annotation);
          setSelectedTool("select");
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    if (["rectangle", "circle", "line"].includes(selectedTool)) {
      const annotation: ShapeAnnotation = {
        id: generateId(),
        type: selectedTool as "rectangle" | "circle" | "line",
        x,
        y,
        width: selectedTool === "line" ? 100 : 100,
        height: selectedTool === "line" ? 0 : 100,
        rotation: 0,
        ...shapeProps,
        x2: selectedTool === "line" ? x + 100 : undefined,
        y2: selectedTool === "line" ? y : undefined,
      };
      addAnnotation(annotation);
      setSelectedTool("select");
    }
  };

  const handleMouseDown = (e: React.MouseEvent, annotationId: string, handle?: string) => {
    e.stopPropagation();
    
    if (handle) {
      isResizing.current = true;
      resizeHandle.current = handle;
    } else {
      isDragging.current = true;
    }
    
    setSelectedAnnotation(annotationId);
    
    const annotation = getCurrentPageAnnotations().find((a) => a.id === annotationId);
    if (!annotation) return;
    
    dragStart.current = { x: e.clientX, y: e.clientY };
    annotationStart.current = { x: annotation.x, y: annotation.y, width: annotation.width, height: annotation.height };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedAnnotation) return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (isDragging.current) {
      updateAnnotation(selectedAnnotation, {
        x: annotationStart.current.x + dx,
        y: annotationStart.current.y + dy,
      });
    } else if (isResizing.current) {
      let newWidth = annotationStart.current.width;
      let newHeight = annotationStart.current.height;
      let newX = annotationStart.current.x;
      let newY = annotationStart.current.y;

      if (resizeHandle.current.includes("e")) {
        newWidth = Math.max(20, annotationStart.current.width + dx);
      }
      if (resizeHandle.current.includes("w")) {
        newWidth = Math.max(20, annotationStart.current.width - dx);
        newX = annotationStart.current.x + dx;
      }
      if (resizeHandle.current.includes("s")) {
        newHeight = Math.max(20, annotationStart.current.height + dy);
      }
      if (resizeHandle.current.includes("n")) {
        newHeight = Math.max(20, annotationStart.current.height - dy);
        newY = annotationStart.current.y + dy;
      }

      updateAnnotation(selectedAnnotation, { x: newX, y: newY, width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current || isResizing.current) {
      saveToHistory(currentPage, getCurrentPageAnnotations());
    }
    isDragging.current = false;
    isResizing.current = false;
  };

  const exportPDF = async () => {
    if (!file || !pdfDocRef.current) return;

    setIsProcessing(true);
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const pageAnnotations = annotations[pageNum] || [];
        if (pageAnnotations.length === 0) continue;

        const pdfPage = pdfLibDoc.getPage(pageNum - 1);
        const { width: pageWidth, height: pageHeight } = pdfPage.getSize();

        const overlayCanvas = document.createElement("canvas");
        const scale = viewportRef.current?.scale || 1.5;
        overlayCanvas.width = pageWidth * scale;
        overlayCanvas.height = pageHeight * scale;
        const ctx = overlayCanvas.getContext("2d");
        if (!ctx) continue;

        for (const annotation of pageAnnotations) {
          const scaleX = (pageWidth * scale) / (viewportRef.current?.width || 1);
          const scaleY = (pageHeight * scale) / (viewportRef.current?.height || 1);

          if (annotation.type === "text") {
            ctx.save();
            ctx.font = `${annotation.italic ? "italic " : ""}${annotation.bold ? "bold " : ""}${annotation.fontSize * scale}px ${annotation.fontFamily}`;
            ctx.fillStyle = annotation.color;
            ctx.fillText(annotation.text, annotation.x * scaleX, (annotation.y + annotation.fontSize) * scaleY);
            ctx.restore();
          } else if (annotation.type === "image") {
            const img = new Image();
            img.src = annotation.imageData;
            await new Promise((resolve) => { img.onload = resolve; });
            ctx.globalAlpha = annotation.opacity;
            ctx.drawImage(img, annotation.x * scaleX, annotation.y * scaleY, annotation.width * scaleX, annotation.height * scaleY);
            ctx.globalAlpha = 1;
          } else if (annotation.type === "rectangle") {
            ctx.fillStyle = annotation.fillColor;
            ctx.strokeStyle = annotation.borderColor;
            ctx.lineWidth = annotation.borderWidth;
            ctx.fillRect(annotation.x * scaleX, annotation.y * scaleY, annotation.width * scaleX, annotation.height * scaleY);
            ctx.strokeRect(annotation.x * scaleX, annotation.y * scaleY, annotation.width * scaleX, annotation.height * scaleY);
          } else if (annotation.type === "circle") {
            ctx.fillStyle = annotation.fillColor;
            ctx.strokeStyle = annotation.borderColor;
            ctx.lineWidth = annotation.borderWidth;
            ctx.beginPath();
            ctx.ellipse(
              (annotation.x + annotation.width / 2) * scaleX,
              (annotation.y + annotation.height / 2) * scaleY,
              (annotation.width / 2) * scaleX,
              (annotation.height / 2) * scaleY,
              0, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
          } else if (annotation.type === "line") {
            ctx.strokeStyle = annotation.borderColor;
            ctx.lineWidth = annotation.borderWidth;
            ctx.beginPath();
            ctx.moveTo(annotation.x * scaleX, annotation.y * scaleY);
            ctx.lineTo((annotation.x + annotation.width) * scaleX, (annotation.y + annotation.height) * scaleY);
            ctx.stroke();
          }
        }

        const imageBytes = await new Promise<Uint8Array>((resolve) => {
          overlayCanvas.toBlob(async (blob) => {
            if (blob) {
              const buffer = await blob.arrayBuffer();
              resolve(new Uint8Array(buffer));
            }
          }, "image/png");
        });

        const image = await pdfLibDoc.embedPng(imageBytes);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }

      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `edited-${file.name}`;
      link.click();
      
      setSuccess("PDF exported successfully!");
    } catch {
      setError("Failed to export PDF.");
    }

    setIsProcessing(false);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page);
      setSelectedAnnotation(null);
    }
  };

  const selectedAnnotationData = getCurrentPageAnnotations().find((a) => a.id === selectedAnnotation);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
          <Edit3 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">
          PDF Editor
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Add text, images, and shapes to your PDF
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

      {!file ? (
        <PDFUploadZone onFileSelect={loadPDF} />
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-6">
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Tools</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedTool("select")}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                    selectedTool === "select" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <MousePointer className="w-5 h-5" />
                  <span className="text-xs">Select</span>
                </button>
                <button
                  onClick={() => setSelectedTool("text")}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                    selectedTool === "text" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-xs">Text</span>
                </button>
                <button
                  onClick={() => setSelectedTool("image")}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                    selectedTool === "image" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-xs">Image</span>
                </button>
                <button
                  onClick={() => setSelectedTool("rectangle")}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                    selectedTool === "rectangle" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <Square className="w-5 h-5" />
                  <span className="text-xs">Rect</span>
                </button>
                <button
                  onClick={() => setSelectedTool("circle")}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                    selectedTool === "circle" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <Circle className="w-5 h-5" />
                  <span className="text-xs">Circle</span>
                </button>
                <button
                  onClick={() => setSelectedTool("line")}
                  className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                    selectedTool === "line" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <Minus className="w-5 h-5" />
                  <span className="text-xs">Line</span>
                </button>
              </div>
            </div>

            {selectedTool === "text" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Text Properties</h3>
                <input
                  type="text"
                  value={textProps.text}
                  onChange={(e) => setTextProps({ ...textProps, text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                  placeholder="Text content"
                />
                <select
                  value={textProps.fontFamily}
                  onChange={(e) => setTextProps({ ...textProps, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={textProps.fontSize}
                  onChange={(e) => setTextProps({ ...textProps, fontSize: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                  min="8"
                  max="200"
                />
                <input
                  type="color"
                  value={textProps.color}
                  onChange={(e) => setTextProps({ ...textProps, color: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setTextProps({ ...textProps, bold: !textProps.bold })}
                    className={`flex-1 py-2 rounded-lg font-bold ${textProps.bold ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setTextProps({ ...textProps, italic: !textProps.italic })}
                    className={`flex-1 py-2 rounded-lg italic ${textProps.italic ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
                  >
                    I
                  </button>
                </div>
              </div>
            )}

            {["rectangle", "circle", "line"].includes(selectedTool) && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Shape Properties</h3>
                {selectedTool !== "line" && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Fill Color</label>
                    <input
                      type="color"
                      value={shapeProps.fillColor}
                      onChange={(e) => setShapeProps({ ...shapeProps, fillColor: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Border Color</label>
                  <input
                    type="color"
                    value={shapeProps.borderColor}
                    onChange={(e) => setShapeProps({ ...shapeProps, borderColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Border Width: {shapeProps.borderWidth}</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={shapeProps.borderWidth}
                    onChange={(e) => setShapeProps({ ...shapeProps, borderWidth: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {selectedAnnotationData && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Selected Annotation</h3>
                {selectedAnnotationData.type === "text" && (
                  <>
                    <input
                      type="text"
                      value={selectedAnnotationData.text}
                      onChange={(e) => updateAnnotation(selectedAnnotationData.id, { text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                    />
                    <input
                      type="number"
                      value={selectedAnnotationData.fontSize}
                      onChange={(e) => updateAnnotation(selectedAnnotationData.id, { fontSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                    />
                  </>
                )}
                <button
                  onClick={() => deleteAnnotation(selectedAnnotationData.id)}
                  className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={(historyIndex[currentPage] || 0) <= 0}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </button>
                <button
                  onClick={redo}
                  disabled={(historyIndex[currentPage] || -1) >= (history[currentPage]?.length || 0) - 1}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Redo2 className="w-4 h-4" />
                  Redo
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-700 dark:text-gray-200">
                Page {currentPage} of {pageCount}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={containerRef}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-auto"
              style={{ minHeight: "500px" }}
            >
              <div
                ref={overlayRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative inline-block"
                style={{ cursor: selectedTool === "select" ? "default" : "crosshair" }}
              >
                <canvas ref={canvasRef} className="block" />
                
                {getCurrentPageAnnotations().map((annotation) => (
                  <div
                    key={annotation.id}
                    onMouseDown={(e) => handleMouseDown(e, annotation.id)}
                    className={`absolute ${selectedAnnotation === annotation.id ? "ring-2 ring-indigo-500" : ""}`}
                    style={{
                      left: annotation.x,
                      top: annotation.y,
                      width: annotation.width,
                      height: annotation.type === "line" ? 4 : annotation.height,
                      zIndex: ANNOTATION_Z_INDEX,
                    }}
                  >
                    {annotation.type === "text" && (
                      <div
                        style={{
                          fontFamily: annotation.fontFamily,
                          fontSize: annotation.fontSize,
                          color: annotation.color,
                          fontWeight: annotation.bold ? "bold" : "normal",
                          fontStyle: annotation.italic ? "italic" : "normal",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {annotation.text}
                      </div>
                    )}
                    {annotation.type === "image" && (
                      <img
                        src={annotation.imageData}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{ opacity: annotation.opacity }}
                        draggable={false}
                      />
                    )}
                    {annotation.type === "rectangle" && (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundColor: annotation.fillColor,
                          border: `${annotation.borderWidth}px solid ${annotation.borderColor}`,
                        }}
                      />
                    )}
                    {annotation.type === "circle" && (
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          backgroundColor: annotation.fillColor,
                          border: `${annotation.borderWidth}px solid ${annotation.borderColor}`,
                        }}
                      />
                    )}
                    {annotation.type === "line" && (
                      <div
                        className="w-full"
                        style={{
                          height: annotation.borderWidth,
                          backgroundColor: annotation.borderColor,
                        }}
                      />
                    )}
                    
                    {selectedAnnotation === annotation.id && (
                      <>
                        <div onMouseDown={(e) => handleMouseDown(e, annotation.id, "nw")} className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-indigo-500 cursor-nw-resize" />
                        <div onMouseDown={(e) => handleMouseDown(e, annotation.id, "ne")} className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-indigo-500 cursor-ne-resize" />
                        <div onMouseDown={(e) => handleMouseDown(e, annotation.id, "sw")} className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-indigo-500 cursor-sw-resize" />
                        <div onMouseDown={(e) => handleMouseDown(e, annotation.id, "se")} className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-indigo-500 cursor-se-resize" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={exportPDF}
                disabled={isProcessing}
                className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  "Processing..."
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export PDF
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  pdfDocRef.current = null;
                  setPageCount(0);
                  setAnnotations({});
                  setSelectedAnnotation(null);
                }}
                className="py-3 px-6 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">How to use:</h3>
        <ol className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
          <li>1. Upload your PDF file (max 10MB)</li>
          <li>2. Select a tool: Select, Text, Image, Rectangle, Circle, or Line</li>
          <li>3. Click on the PDF to add annotations</li>
          <li>4. Drag to move, use handles to resize</li>
          <li>5. Use properties panel to customize</li>
          <li>6. Navigate pages with arrow buttons</li>
          <li>7. Click "Export PDF" to download</li>
        </ol>
      </div>
    </div>
  );
}
