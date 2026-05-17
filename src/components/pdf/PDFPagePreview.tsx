import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFPagePreviewProps {
  file: File;
  pageNumber: number;
  scale?: number;
  onLoad?: (canvas: HTMLCanvasElement) => void;
  className?: string;
}

export interface PDFPagePreviewRef {
  getCanvas: () => HTMLCanvasElement | null;
  getImageData: () => ImageData | null;
  toDataURL: (type?: string) => string | null;
}

const PDFPagePreview = forwardRef<PDFPagePreviewRef, PDFPagePreviewProps>(
  ({ file, pageNumber, scale = 1.5, onLoad, className = "" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getImageData: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },
      toDataURL: (type = "image/png") => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL(type) : null;
      },
    }));

    useEffect(() => {
      let mounted = true;

      const renderPage = async () => {
        if (!canvasRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale });

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

          if (mounted) {
            setIsLoading(false);
            onLoad?.(canvas);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to render page";
          setError(message);
            setIsLoading(false);
          }
        }
      };

      renderPage();

      return () => {
        mounted = false;
      };
    }, [file, pageNumber, scale, onLoad]);

    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Loading page...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-red-500">{error}</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block rounded-lg shadow-lg"
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </div>
    );
  }
);

PDFPagePreview.displayName = "PDFPagePreview";

export default PDFPagePreview;
