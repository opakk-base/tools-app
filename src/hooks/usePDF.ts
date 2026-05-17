import { useState, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface UsePDFReturn {
  pdfDoc: PDFDocument | null;
  pdfJsDoc: pdfjsLib.PDFDocumentProxy | null;
  pageCount: number;
  isLoading: boolean;
  error: string | null;
  loadPDF: (file: File) => Promise<boolean>;
  renderPage: (pageNumber: number, canvas: HTMLCanvasElement, scale?: number) => Promise<void>;
  getPageAsImage: (pageNumber: number, scale?: number) => Promise<string>;
  save: () => Promise<Uint8Array>;
  reset: () => void;
}

export function usePDF(): UsePDFReturn {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);

  const loadPDF = useCallback(async (file: File): Promise<boolean> => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return false;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("File size exceeds 10MB limit.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      arrayBufferRef.current = arrayBuffer;

      const [pdfLibDoc, pdfJsDocument] = await Promise.all([
        PDFDocument.load(arrayBuffer),
        pdfjsLib.getDocument({ data: arrayBuffer }).promise,
      ]);

      setPdfDoc(pdfLibDoc);
      setPdfJsDoc(pdfJsDocument);
      setPageCount(pdfLibDoc.getPageCount());
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load PDF";
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, []);

  const renderPage = useCallback(async (
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.5
  ): Promise<void> => {
    if (!pdfJsDoc) return;

    const page = await pdfJsDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;
  }, [pdfJsDoc]);

  const getPageAsImage = useCallback(async (
    pageNumber: number,
    scale: number = 1.5
  ): Promise<string> => {
    if (!pdfJsDoc) return "";

    const page = await pdfJsDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    return canvas.toDataURL("image/png");
  }, [pdfJsDoc]);

  const save = useCallback(async (): Promise<Uint8Array> => {
    if (!pdfDoc) throw new Error("No PDF loaded");
    return await pdfDoc.save();
  }, [pdfDoc]);

  const reset = useCallback(() => {
    setPdfDoc(null);
    setPdfJsDoc(null);
    setPageCount(0);
    setError(null);
    arrayBufferRef.current = null;
  }, []);

  return {
    pdfDoc,
    pdfJsDoc,
    pageCount,
    isLoading,
    error,
    loadPDF,
    renderPage,
    getPageAsImage,
    save,
    reset,
  };
}
