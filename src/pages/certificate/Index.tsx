import { useMemo, useRef, useState } from "react";
import { Download, ImagePlus, Layers, Trash2, Type } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

type LayerType = "text" | "image";

type BaseLayer = {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

type TextLayer = BaseLayer & {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  fontWeight: number;
};

type ImageLayer = BaseLayer & {
  type: "image";
  src: string;
};

type Layer = TextLayer | ImageLayer;

type Orientation = "landscape" | "portrait";

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function GenerateCertificate() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);

  const [layers, setLayers] = useState<Layer[]>([
    {
      id: makeId(),
      type: "text",
      text: "CERTIFICATE OF ACHIEVEMENT",
      x: 240,
      y: 120,
      width: 720,
      height: 90,
      zIndex: 1,
      fontSize: 46,
      color: "#0f172a",
      fontWeight: 700,
    },
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) || null,
    [layers, selectedLayerId]
  );

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers]
  );

  const clampedSize = (value: number, min = 20) => Math.max(min, value);

  const bringToFront = (id: string) => {
    const maxZ = layers.length ? Math.max(...layers.map((l) => l.zIndex)) : 1;
    updateLayer(id, { zIndex: maxZ + 1 });
  };

  const sendToBack = (id: string) => {
    const minZ = layers.length ? Math.min(...layers.map((l) => l.zIndex)) : 1;
    updateLayer(id, { zIndex: minZ - 1 });
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const exportPng = async () => {
    if (!boardRef.current) return;
    const dataUrl = await toPng(boardRef.current, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `certificate-${Date.now()}.png`;
    a.click();
  };

  const exportPdf = async () => {
    if (!boardRef.current) return;
    const dataUrl = await toPng(boardRef.current, { cacheBust: true, pixelRatio: 2 });
    const pdf = new jsPDF({
      orientation: canvasWidth >= canvasHeight ? "landscape" : "portrait",
      unit: "px",
      format: [canvasWidth, canvasHeight],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, canvasWidth, canvasHeight);
    pdf.save(`certificate-${Date.now()}.pdf`);
  };

  const updateLayer = (id: string, patch: Partial<Layer>) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? ({ ...layer, ...patch } as Layer) : layer)));
  };

  const addTextLayer = () => {
    const zIndex = layers.length ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 1;
    const id = makeId();
    setLayers((prev) => [
      ...prev,
      {
        id,
        type: "text",
        text: "Text baru",
        x: 80,
        y: 80,
        width: 260,
        height: 70,
        zIndex,
        fontSize: 28,
        color: "#111827",
        fontWeight: 600,
      },
    ]);
    setSelectedLayerId(id);
  };

  const addImageLayer = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const zIndex = layers.length ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 1;
      const id = makeId();
      setLayers((prev) => [
        ...prev,
        {
          id,
          type: "image",
          src: String(reader.result || ""),
          x: 140,
          y: 180,
          width: 260,
          height: 200,
          zIndex,
        },
      ]);
      setSelectedLayerId(id);
    };
    reader.readAsDataURL(file);
  };

  const onStartDrag = (e: React.MouseEvent, id: string) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;

    dragRef.current = {
      id,
      offsetX: e.clientX - rect.left - layer.x,
      offsetY: e.clientY - rect.top - layer.y,
    };
    setSelectedLayerId(id);
  };

  const onBoardMouseMove = (e: React.MouseEvent) => {
    const board = boardRef.current;
    if (!board || !dragRef.current) return;
    const rect = board.getBoundingClientRect();

    const newX = e.clientX - rect.left - dragRef.current.offsetX;
    const newY = e.clientY - rect.top - dragRef.current.offsetY;

    updateLayer(dragRef.current.id, {
      x: Math.max(0, Math.min(newX, canvasWidth - 20)),
      y: Math.max(0, Math.min(newY, canvasHeight - 20)),
    });
  };

  const onBoardMouseUp = () => {
    dragRef.current = null;
  };

  const onResizeHandleDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const board = boardRef.current;
    if (!board) return;

    const layer = layers.find((l) => l.id === id);
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = layer.width;
    const startHeight = layer.height;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      updateLayer(id, {
        width: clampedSize(startWidth + dx),
        height: clampedSize(startHeight + dy),
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const setPreset = (nextOrientation: Orientation) => {
    setOrientation(nextOrientation);
    if (nextOrientation === "landscape") {
      setCanvasWidth(1200);
      setCanvasHeight(800);
    } else {
      setCanvasWidth(800);
      setCanvasHeight(1200);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Generate Certificate</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Canvas custom size, orientation, layer text/image, drag-drop, dan resize.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-1 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white/90">Canvas</h2>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setPreset("landscape")}
                className={`rounded-lg px-3 py-2 text-xs ${orientation === "landscape" ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
              >
                Landscape
              </button>
              <button
                onClick={() => setPreset("portrait")}
                className={`rounded-lg px-3 py-2 text-xs ${orientation === "portrait" ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
              >
                Portrait
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="number"
                value={canvasWidth}
                onChange={(e) => setCanvasWidth(clampedSize(Number(e.target.value), 200))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Width"
              />
              <input
                type="number"
                value={canvasHeight}
                onChange={(e) => setCanvasHeight(clampedSize(Number(e.target.value), 200))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Height"
              />
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={addTextLayer} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white">
              <Type size={16} /> Tambah Text Layer
            </button>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900">
              <ImagePlus size={16} /> Tambah Gambar Layer
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addImageLayer(file);
                }}
              />
            </label>
            <button onClick={exportPng} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white">
              <Download size={16} /> Export PNG
            </button>
            <button onClick={exportPdf} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
              <Download size={16} /> Export PDF
            </button>
          </div>

          {selectedLayer && (
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Layer Properties</h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={Math.round(selectedLayer.x)}
                  onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                />
                <input
                  type="number"
                  value={Math.round(selectedLayer.y)}
                  onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => bringToFront(selectedLayer.id)} className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                  <span className="inline-flex items-center gap-1"><Layers size={12} /> Front</span>
                </button>
                <button onClick={() => sendToBack(selectedLayer.id)} className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                  Back
                </button>
                <button onClick={() => removeLayer(selectedLayer.id)} className="col-span-2 rounded bg-red-600 px-2 py-1 text-xs text-white">
                  <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Hapus Layer</span>
                </button>
              </div>

              {selectedLayer.type === "text" && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={selectedLayer.text}
                    onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value } as Partial<Layer>)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                    rows={3}
                  />
                  <input
                    type="number"
                    value={selectedLayer.fontSize}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontSize: clampedSize(Number(e.target.value), 8) } as Partial<Layer>)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Layers</h3>
            <div className="space-y-2">
              {sortedLayers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-2 py-1 text-xs ${
                    selectedLayerId === layer.id ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <span className="truncate text-left">{layer.type === "text" ? (layer as TextLayer).text : "Image Layer"}</span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">z:{layer.zIndex}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-black/20 xl:col-span-3 overflow-auto">
          <div
            ref={boardRef}
            className="relative mx-auto border border-dashed border-gray-300 bg-white shadow-xl"
            style={{ width: canvasWidth, height: canvasHeight }}
            onMouseMove={onBoardMouseMove}
            onMouseUp={onBoardMouseUp}
            onMouseLeave={onBoardMouseUp}
            onClick={() => setSelectedLayerId(null)}
          >
            {sortedLayers.map((layer) => {
              const isSelected = selectedLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  className={`absolute cursor-move select-none ${isSelected ? "ring-2 ring-brand-500" : ""}`}
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    zIndex: layer.zIndex,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onStartDrag(e, layer.id);
                  }}
                >
                  {layer.type === "text" ? (
                    <div
                      className="h-full w-full whitespace-pre-wrap break-words"
                      style={{
                        fontSize: layer.fontSize,
                        color: layer.color,
                        fontWeight: layer.fontWeight,
                        lineHeight: 1.1,
                      }}
                    >
                      {layer.text}
                    </div>
                  ) : (
                    <img src={layer.src} alt="layer" className="h-full w-full object-contain" draggable={false} />
                  )}

                  {isSelected && (
                    <button
                      onMouseDown={(e) => onResizeHandleDown(e, layer.id)}
                      className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border border-white bg-brand-500"
                    >
                      <span className="sr-only">resize</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
