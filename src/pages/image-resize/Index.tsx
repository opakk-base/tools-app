import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  Image as ImageIcon,
  Maximize2,
  RotateCw,
  Crop,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

type ResizeMode = "dimensions" | "scale" | "longest-edge";

interface ImageInfo {
  name: string;
  width: number;
  height: number;
  size: number;
  type: string;
}

export default function ImageResize() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  // Resize settings
  const [resizeMode, setResizeMode] = useState<ResizeMode>("dimensions");
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(600);
  const [scalePercent, setScalePercent] = useState<number>(50);
  const [longestEdge, setLongestEdge] = useState<number>(1920);
  
  // Rotation
  const [rotation, setRotation] = useState<number>(0);
  
  // Output settings
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState<number>(90);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  
  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError("");
    setSuccess("");
    setOutputUrl(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setImageInfo({
          name: file.name,
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
        });
        setTargetWidth(img.width);
        setTargetHeight(img.height);
        setPreviewUrl(URL.createObjectURL(file));
      };
      img.onerror = () => {
        setError("Failed to load image.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const calculateDimensions = useCallback((): { width: number; height: number } => {
    if (!originalImage) return { width: 0, height: 0 };
    
    const origW = originalImage.width;
    const origH = originalImage.height;
    const aspectRatio = origW / origH;
    
    let newW: number, newH: number;
    
    switch (resizeMode) {
      case "dimensions":
        newW = targetWidth;
        newH = maintainAspectRatio ? Math.round(targetWidth / aspectRatio) : targetHeight;
        if (maintainAspectRatio && newH > targetHeight) {
          newH = targetHeight;
          newW = Math.round(targetHeight * aspectRatio);
        }
        break;
      case "scale":
        newW = Math.round(origW * (scalePercent / 100));
        newH = Math.round(origH * (scalePercent / 100));
        break;
      case "longest-edge":
        if (origW > origH) {
          newW = longestEdge;
          newH = Math.round(longestEdge / aspectRatio);
        } else {
          newH = longestEdge;
          newW = Math.round(longestEdge * aspectRatio);
        }
        break;
      default:
        newW = origW;
        newH = origH;
    }
    
    return { width: newW, height: newH };
  }, [originalImage, resizeMode, targetWidth, targetHeight, scalePercent, longestEdge, maintainAspectRatio]);

  const processImage = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;
    
    setIsProcessing(true);
    setError("");
    setSuccess("");
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");
      
      const { width, height } = calculateDimensions();
      
      // Handle rotation
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const rotatedWidth = Math.round(width * cos + height * sin);
      const rotatedHeight = Math.round(width * sin + height * cos);
      
      canvas.width = rotatedWidth;
      canvas.height = rotatedHeight;
      
      // Clear and draw with rotation
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Move to center, rotate, then draw
      ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(originalImage, -width / 2, -height / 2, width, height);
      
      // Generate output
      const mimeType = outputFormat === "jpeg" ? "image/jpeg" : outputFormat === "webp" ? "image/webp" : "image/png";
      const qualityValue = outputFormat === "png" ? undefined : quality / 100;
      
      const dataUrl = canvas.toDataURL(mimeType, qualityValue);
      setOutputUrl(dataUrl);
      setSuccess(`Image resized to ${rotatedWidth}×${rotatedHeight}px`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, calculateDimensions, rotation, outputFormat, quality]);

  const downloadImage = useCallback(() => {
    if (!outputUrl || !imageInfo) return;
    
    const link = document.createElement("a");
    const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const baseName = imageInfo.name.replace(/\.[^/.]+$/, "");
    link.download = `${baseName}-resized.${ext}`;
    link.href = outputUrl;
    link.click();
  }, [outputUrl, imageInfo, outputFormat]);

  const resetAll = useCallback(() => {
    setOriginalImage(null);
    setImageInfo(null);
    setPreviewUrl(null);
    setOutputUrl(null);
    setTargetWidth(800);
    setTargetHeight(600);
    setScalePercent(50);
    setLongestEdge(1920);
    setRotation(0);
    setError("");
    setSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg mb-4">
          <Maximize2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">
          Image Resizer
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Resize, rotate, and convert images directly in your browser
        </p>
      </header>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Upload Section */}
        {!originalImage && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-200" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Click to upload an image
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supports PNG, JPEG, WebP, GIF, BMP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">{success}</div>
          </div>
        )}

        {/* Editor Section */}
        {originalImage && imageInfo && (
          <div className="space-y-6">
            {/* Image Info Bar */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  <span className="font-medium text-sm dark:text-white/90">{imageInfo.name}</span>
                </div>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {imageInfo.width} × {imageInfo.height}px
                </span>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {(imageInfo.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                onClick={resetAll}
                className="text-sm text-red-600 dark:text-red-200 hover:underline"
              >
                Remove & Upload New
              </button>
            </div>

            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original Preview */}
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Original
                </h3>
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center min-h-[200px]">
                  <img
                    src={previewUrl || ""}
                    alt="Original"
                    className="max-w-full max-h-[300px] object-contain"
                  />
                </div>
              </div>

              {/* Output Preview */}
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Output Preview
                </h3>
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center min-h-[200px]">
                  {outputUrl ? (
                    <img
                      src={outputUrl}
                      alt="Output"
                      className="max-w-full max-h-[300px] object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500 text-sm">
                      Click "Process Image" to preview
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 space-y-6">
              {/* Resize Mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Resize Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "dimensions", label: "Dimensions", icon: <Maximize2 className="w-4 h-4" /> },
                    { value: "scale", label: "Scale %", icon: <Crop className="w-4 h-4" /> },
                    { value: "longest-edge", label: "Longest Edge", icon: <Maximize2 className="w-4 h-4" /> },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setResizeMode(mode.value as ResizeMode)}
                      className={`py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        resizeMode === mode.value
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {mode.icon}
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode-specific inputs */}
              {resizeMode === "dimensions" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={targetWidth}
                      onChange={(e) => setTargetWidth(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={targetHeight}
                      onChange={(e) => setTargetHeight(Number(e.target.value))}
                      disabled={maintainAspectRatio}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={maintainAspectRatio}
                        onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        Maintain aspect ratio
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {resizeMode === "scale" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Scale: {scalePercent}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="200"
                    value={scalePercent}
                    onChange={(e) => setScalePercent(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1%</span>
                    <span>Original: {imageInfo.width}×{imageInfo.height}</span>
                    <span>200%</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Output: {Math.round(imageInfo.width * scalePercent / 100)} × {Math.round(imageInfo.height * scalePercent / 100)}px
                  </p>
                </div>
              )}

              {resizeMode === "longest-edge" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Longest Edge (px)
                  </label>
                  <select
                    value={longestEdge}
                    onChange={(e) => setLongestEdge(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={640}>640px</option>
                    <option value={800}>800px</option>
                    <option value={1024}>1024px</option>
                    <option value={1280}>1280px</option>
                    <option value={1600}>1600px</option>
                    <option value={1920}>1920px (Full HD)</option>
                    <option value={2560}>2560px (2K)</option>
                    <option value={3840}>3840px (4K)</option>
                  </select>
                </div>
              )}

              {/* Rotation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <RotateCw className="w-4 h-4" />
                  Rotation
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => setRotation(deg)}
                        className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          rotation === deg
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Output Format */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Output Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOutputFormat(fmt)}
                        className={`py-2 px-4 rounded-lg text-sm font-medium uppercase transition-colors ${
                          outputFormat === fmt
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {outputFormat !== "png" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Quality: {quality}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-200">
                  <p className="font-medium mb-1">Processing happens entirely in your browser</p>
                  <p className="text-blue-600 dark:text-blue-300">Your images are never uploaded to any server.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white rounded-lg font-medium shadow-md shadow-indigo-200 dark:shadow-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : "Process Image"}
                </button>
                
                {outputUrl && (
                  <button
                    onClick={downloadImage}
                    className="py-3 px-6 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-white rounded-lg font-medium shadow-md shadow-emerald-200 dark:shadow-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}