import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Download,
  Wand2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import PDFUploadZone from "../../components/pdf/PDFUploadZone";
import type {
  FilterSettings,
  PresetName,
} from "./types";
import {
  PRESETS,
} from "./types";
import { applyFilters } from "./filters";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function PDFEnhance() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [selectedPreset, setSelectedPreset] = useState<PresetName>("document");
  const [globalSettings, setGlobalSettings] = useState<FilterSettings>(PRESETS.document.settings);
  const [pageOverrides, setPageOverrides] = useState<Record<number, FilterSettings>>({});
  const [usePageOverride, setUsePageOverride] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const enhancedCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

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
    setPageOverrides({});
    setUsePageOverride(false);
    setPreviewUrl(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setPageCount(pdf.numPages);
      setCurrentPage(1);
    } catch {
      setError("Failed to load PDF. Invalid file.");
    }
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocRef.current || !originalCanvasRef.current) return;

    const pdf = pdfDocRef.current;
    const page = await pdf.getPage(pageNumber);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const originalCanvas = originalCanvasRef.current;
    originalCanvas.width = viewport.width;
    originalCanvas.height = viewport.height;

    const originalCtx = originalCanvas.getContext("2d");
    if (!originalCtx) return;

        await page.render({
          canvasContext: originalCtx,
          viewport,
          canvas: originalCanvas,
        }).promise;

    if (enhancedCanvasRef.current) {
      const enhancedCanvas = enhancedCanvasRef.current;
      enhancedCanvas.width = viewport.width;
      enhancedCanvas.height = viewport.height;
      
      const enhancedCtx = enhancedCanvas.getContext("2d");
      if (enhancedCtx) {
        enhancedCtx.drawImage(originalCanvas, 0, 0);
        
        const settings = usePageOverride && pageOverrides[pageNumber]
          ? pageOverrides[pageNumber]
          : globalSettings;
        
        applyFilters(enhancedCanvas, settings);
      }
    }
  }, [globalSettings, pageOverrides, usePageOverride]);

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage, pageCount]);

  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [globalSettings, pageOverrides, usePageOverride, currentPage, renderPage, pageCount]);

  const handlePresetChange = (preset: PresetName) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      setGlobalSettings(PRESETS[preset].settings);
    }
  };

  const handleGlobalSettingChange = <K extends keyof FilterSettings>(
    key: K,
    value: FilterSettings[K]
  ) => {
    setSelectedPreset("custom");
    setGlobalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageOverrideChange = <K extends keyof FilterSettings>(
    key: K,
    value: FilterSettings[K]
  ) => {
    setPageOverrides((prev) => ({
      ...prev,
      [currentPage]: {
        ...(prev[currentPage] || globalSettings),
        [key]: value,
      },
    }));
  };

  const getCurrentPageSettings = (): FilterSettings => {
    if (usePageOverride && pageOverrides[currentPage]) {
      return pageOverrides[currentPage];
    }
    return globalSettings;
  };

  const processAllPages = useCallback(async () => {
    if (!pdfDocRef.current) return;

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      const pdf = pdfDocRef.current;
      const pdfLibDoc = await PDFDocument.load(await file!.arrayBuffer());
      
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const scale = 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const settings = pageOverrides[i] || globalSettings;
        applyFilters(canvas, settings);

        const imageBytes = await new Promise<Uint8Array>((resolve) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const buffer = await blob.arrayBuffer();
              resolve(new Uint8Array(buffer));
            }
          }, "image/png");
        });

        const image = await pdfLibDoc.embedPng(imageBytes);
        const pdfPage = pdfLibDoc.getPage(i - 1);
        const { width, height } = pdfPage.getSize();
        
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setSuccess(`Enhanced ${pageCount} page(s). Ready to download.`);
    } catch {
      setError("Failed to process PDF.");
    }

    setIsProcessing(false);
  }, [file, pageCount, globalSettings, pageOverrides]);

  const downloadEnhanced = useCallback(() => {
    if (!previewUrl || !file) return;
    
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `enhanced-${file.name}`;
    link.click();
  }, [previewUrl, file]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
          <Wand2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">
          PDF Enhance
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Enhance scanned PDF with filters like a scanner
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
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pageCount} page(s) • {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                pdfDocRef.current = null;
                setPageCount(0);
                setPreviewUrl(null);
                setSuccess("");
              }}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>

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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-center">Original</h3>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 flex items-center justify-center min-h-[400px]">
                <canvas ref={originalCanvasRef} className="max-w-full shadow-lg rounded" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-center">Enhanced</h3>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 flex items-center justify-center min-h-[400px]">
                <canvas ref={enhancedCanvasRef} className="max-w-full shadow-lg rounded" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Filter Presets</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key as PresetName)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all
                      ${selectedPreset === key
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }
                    `}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Global Settings</h4>
                
                <div>
                  <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                    <span>Brightness</span>
                    <span>{globalSettings.brightness}</span>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={globalSettings.brightness}
                    onChange={(e) => handleGlobalSettingChange("brightness", Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                    <span>Contrast</span>
                    <span>{globalSettings.contrast}</span>
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={globalSettings.contrast}
                    onChange={(e) => handleGlobalSettingChange("contrast", Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                    <span>Sharpen</span>
                    <span>{globalSettings.sharpen}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={globalSettings.sharpen}
                    onChange={(e) => handleGlobalSettingChange("sharpen", Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                    <span>Despeckle</span>
                    <span>{globalSettings.despeckle.toFixed(1)}</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={globalSettings.despeckle}
                      onChange={(e) => handleGlobalSettingChange("despeckle", Number(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="999"
                      step="0.5"
                      value={globalSettings.despeckle}
                      onChange={(e) => handleGlobalSettingChange("despeckle", Math.max(0, Number(e.target.value)))}
                      className="w-20 px-2 py-1 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-sm"
                    />
                  </div>
                  {globalSettings.despeckle > 15 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      High values may blur text and slow processing
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={globalSettings.grayscale}
                      onChange={(e) => handleGlobalSettingChange("grayscale", e.target.checked)}
                      className="rounded"
                    />
                    Grayscale
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={globalSettings.blackWhite}
                      onChange={(e) => handleGlobalSettingChange("blackWhite", e.target.checked)}
                      className="rounded"
                    />
                    Black & White
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">Page Override</h4>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={usePageOverride}
                      onChange={(e) => setUsePageOverride(e.target.checked)}
                      className="rounded"
                    />
                    Enable for Page {currentPage}
                  </label>
                </div>

                {usePageOverride && (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Settings for page {currentPage} only
                    </p>

                    <div>
                      <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                        <span>Brightness</span>
                        <span>{getCurrentPageSettings().brightness}</span>
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={getCurrentPageSettings().brightness}
                        onChange={(e) => handlePageOverrideChange("brightness", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                        <span>Contrast</span>
                        <span>{getCurrentPageSettings().contrast}</span>
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={getCurrentPageSettings().contrast}
                        onChange={(e) => handlePageOverrideChange("contrast", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                        <span>Sharpen</span>
                        <span>{getCurrentPageSettings().sharpen}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={getCurrentPageSettings().sharpen}
                        onChange={(e) => handlePageOverrideChange("sharpen", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between text-sm text-gray-700 dark:text-gray-200 mb-1">
                        <span>Despeckle</span>
                        <span>{getCurrentPageSettings().despeckle.toFixed(1)}</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={getCurrentPageSettings().despeckle}
                          onChange={(e) => handlePageOverrideChange("despeckle", Number(e.target.value))}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="0"
                          max="999"
                          step="0.5"
                          value={getCurrentPageSettings().despeckle}
                          onChange={(e) => handlePageOverrideChange("despeckle", Math.max(0, Number(e.target.value)))}
                          className="w-20 px-2 py-1 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-sm"
                        />
                      </div>
                      {getCurrentPageSettings().despeckle > 15 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          High values may blur text and slow processing
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={getCurrentPageSettings().grayscale}
                          onChange={(e) => handlePageOverrideChange("grayscale", e.target.checked)}
                          className="rounded"
                        />
                        Grayscale
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={getCurrentPageSettings().blackWhite}
                          onChange={(e) => handlePageOverrideChange("blackWhite", e.target.checked)}
                          className="rounded"
                        />
                        Black & White
                      </label>
                    </div>
                  </div>
                )}

                {!usePageOverride && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    Enable page override to customize settings for this specific page
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={processAllPages}
              disabled={isProcessing}
              className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Enhance PDF
                </>
              )}
            </button>

            {previewUrl && (
              <button
                onClick={downloadEnhanced}
                className="py-3 px-6 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-white rounded-lg font-medium shadow-md shadow-emerald-200 dark:shadow-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">How to use:</h3>
        <ol className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
          <li>1. Upload your PDF file (max 10MB)</li>
          <li>2. Choose a filter preset or customize settings</li>
          <li>3. Use page override for specific page adjustments</li>
          <li>4. Click "Enhance PDF" to process all pages</li>
          <li>5. Download the enhanced PDF</li>
        </ol>
      </div>
    </div>
  );
}
