import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import type { CertificateLayer, CertificateTemplate } from './types';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const CertificateGenerator: React.FC = () => {
  const [template, setTemplate] = useState<CertificateTemplate>({
    id: '1',
    name: 'Certificate Template',
    backgroundImage: '',
    width: 800,
    height: 600,
    layers: [],
  });

  const setOrientation = (orientation: 'landscape' | 'portrait') => {
    // default sizes; can be refined later
    if (orientation === 'landscape') {
      setTemplate((prev) => ({ ...prev, width: 800, height: 600 }));
    } else {
      setTemplate((prev) => ({ ...prev, width: 600, height: 800 }));
    }
  };

  const setCanvasSize = (width: number, height: number) => {
    const safeW = Number.isFinite(width) ? Math.max(1, Math.min(4000, width)) : 800;
    const safeH = Number.isFinite(height) ? Math.max(1, Math.min(4000, height)) : 600;
    setTemplate((prev) => ({ ...prev, width: safeW, height: safeH }));
  };

  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [draggingLayer, setDraggingLayer] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const deleteLayer = (id: string) => {
    setTemplate((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== id),
    }));
    setSelectedLayer((prev) => (prev === id ? null : prev));
  };

  const moveLayer = (id: string, direction: "up" | "down") => {
    setTemplate((prev) => {
      const idx = prev.layers.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.layers.length) return prev;
      const layers = [...prev.layers];
      const [item] = layers.splice(idx, 1);
      layers.splice(nextIdx, 0, item);
      return { ...prev, layers };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTemplate(prev => ({
            ...prev,
            backgroundImage: event.target!.result as string || ''
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addTextLayer = () => {
    const newLayer: CertificateLayer = {
      id: `layer-${Date.now()}`,
      type: 'text',
      content: 'New Text',
      x: 100,
      y: 100,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      color: '#000000',
      opacity: 1,
    };
    
    setTemplate(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer]
    }));
    setSelectedLayer(newLayer.id);
  };

  const addImageLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newLayer: CertificateLayer = {
            id: `layer-${Date.now()}`,
            type: 'image',
            content: event.target!.result as string || '',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            opacity: 1,
          };
          
          setTemplate(prev => ({
            ...prev,
            layers: [...prev.layers, newLayer]
          }));
          setSelectedLayer(newLayer.id);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const updateLayerProperty = (id: string, property: keyof CertificateLayer, value: string | number | boolean) => {
    setTemplate(prev => ({
      ...prev,
      layers: prev.layers.map(layer => 
        layer.id === id ? { ...layer, [property]: value } : layer
      )
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    const layer = template.layers.find(l => l.id === layerId);
    if (!layer) return;

    setDraggingLayer(layerId);
    setSelectedLayer(layerId);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left - pan.x) / zoom;
      const localY = (e.clientY - rect.top - pan.y) / zoom;

      setDragOffset({
        x: localX - layer.x,
        y: localY - layer.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingLayer && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left - pan.x) / zoom;
      const localY = (e.clientY - rect.top - pan.y) / zoom;

      const newX = localX - dragOffset.x;
      const newY = localY - dragOffset.y;

      updateLayerProperty(draggingLayer, 'x', Math.max(0, newX));
      updateLayerProperty(draggingLayer, 'y', Math.max(0, newY));
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDraggingLayer(null);
    setIsPanning(false);
  };

  const exportAsPng = async () => {
    if (!canvasRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // draw background
    if (template.backgroundImage) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, template.width, template.height);
          resolve();
        };
        img.src = template.backgroundImage;
      });
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, template.width, template.height);
    }

    // draw layers in order
    for (const layer of template.layers) {
      ctx.globalAlpha = layer.opacity ?? 1;
      if (layer.type === 'text') {
        ctx.fillStyle = layer.color || '#000000';
        ctx.font = `${layer.fontWeight || 'normal'} ${layer.fontSize || 24}px ${layer.fontFamily || 'Arial'}`;
        ctx.fillText(layer.content || '', layer.x, layer.y + (layer.fontSize || 24));
      } else {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const w = layer.width ?? 100;
            const h = layer.height ?? 100;
            ctx.drawImage(img, layer.x, layer.y, w, h);
            resolve();
          };
          img.src = layer.content;
        });
      }
    }

    ctx.globalAlpha = 1;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) return;

    downloadBlob(blob, `certificate-${Date.now()}.png`);
  };

  const exportAsPdf = async () => {
    // Render to a PNG dataURL first, then embed into a real PDF page sized to the canvas.
    const canvas = document.createElement('canvas');
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // draw background
    if (template.backgroundImage) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, template.width, template.height);
          resolve();
        };
        img.src = template.backgroundImage;
      });
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, template.width, template.height);
    }

    // draw layers in order
    for (const layer of template.layers) {
      ctx.globalAlpha = layer.opacity ?? 1;
      if (layer.type === 'text') {
        ctx.fillStyle = layer.color || '#000000';
        ctx.font = `${layer.fontWeight || 'normal'} ${layer.fontSize || 24}px ${layer.fontFamily || 'Arial'}`;
        ctx.fillText(layer.content || '', layer.x, layer.y + (layer.fontSize || 24));
      } else {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const w = layer.width ?? 100;
            const h = layer.height ?? 100;
            ctx.drawImage(img, layer.x, layer.y, w, h);
            resolve();
          };
          img.src = layer.content;
        });
      }
    }
    ctx.globalAlpha = 1;

    const imgData = canvas.toDataURL('image/png');

    // Use px units so 1px in canvas == 1 unit in PDF. This keeps sizing exact.
    const orientation = template.width >= template.height ? 'l' : 'p';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [template.width, template.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, template.width, template.height);
    pdf.save(`certificate-${Date.now()}.pdf`);
  };

  const selectedLayerData = template.layers.find(layer => layer.id === selectedLayer);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Certificate Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Create custom certificates with text and image layers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="bg-upload"
              />
              <label
                htmlFor="bg-upload"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                Upload Background
              </label>
              
              <button
                onClick={addTextLayer}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Text
              </button>
              
              <input
                type="file"
                accept="image/*"
                onChange={addImageLayer}
                className="hidden"
                id="image-layer-upload"
              />
              <label
                htmlFor="image-layer-upload"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
              >
                Add Image Layer
              </label>

              <button
                onClick={() => setOrientation('landscape')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                title="Landscape"
              >
                Landscape
              </button>
              <button
                onClick={() => setOrientation('portrait')}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                title="Portrait"
              >
                Portrait
              </button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Size
                </span>
                <input
                  type="number"
                  value={template.width}
                  onChange={(e) => setCanvasSize(parseInt(e.target.value || '0'), template.height)}
                  className="w-20 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  title="Width"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">x</span>
                <input
                  type="number"
                  value={template.height}
                  onChange={(e) => setCanvasSize(template.width, parseInt(e.target.value || '0'))}
                  className="w-20 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  title="Height"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={exportAsPng}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Export PNG
              </button>
              <button
                onClick={exportAsPdf}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Exports a PDF page sized exactly to the canvas"
              >
                Export PDF
              </button>

              <div className="ml-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.2, +(z / 1.1).toFixed(2)))}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                  title="Zoom out"
                >
                  -
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z * 1.1).toFixed(2)))}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPan({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                  title="Reset view"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div
            className="relative rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 overflow-hidden"
            style={{ height: 520 }}
          >
            {/* Zoom & Pan viewport */}
            <div
              ref={canvasRef}
              className="absolute inset-0 cursor-grab"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseDown={(e) => {
                // Pan with middle mouse, or hold Shift + left click
                const wantsPan = e.button === 1 || (e.button === 0 && e.shiftKey);
                if (!wantsPan) return;
                e.preventDefault();
                setIsPanning(true);
                setPanStart({ x: e.clientX, y: e.clientY });
              }}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY;
                const factor = delta > 0 ? 0.9 : 1.1;
                setZoom((prev) => Math.max(0.2, Math.min(3, prev * factor)));
              }}
            >
              <div
                className="relative border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                style={{
                  width: template.width,
                  height: template.height,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'top left',
                  margin: '0 auto',
                }}
              >
                {template.backgroundImage && (
                  <img
                    src={template.backgroundImage}
                    alt="Background"
                    className="absolute top-0 left-0 w-full h-full object-cover"
                  />
                )}
                
                {template.layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`absolute cursor-move border ${selectedLayer === layer.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent'}`}
                    style={{
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width:
                        layer.type === 'image' && layer.width
                          ? `${layer.width}px`
                          : 'auto',
                      height:
                        layer.type === 'image' && layer.height
                          ? `${layer.height}px`
                          : 'auto',
                      opacity: layer.opacity ?? 1,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, layer.id)}
                  >
                    {layer.type === 'text' ? (
                      <div
                        style={{
                          fontSize: `${layer.fontSize}px`,
                          fontFamily: layer.fontFamily,
                          fontWeight: layer.fontWeight,
                          color: layer.color,
                        }}
                      >
                        {layer.content}
                      </div>
                    ) : (
                      <img
                        src={layer.content}
                        alt="Layer"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white/90 mb-4">Layers</h2>

            {/* Layer List */}
            <div className="mb-6 space-y-2">
              {template.layers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No layers yet. Add Text or Image Layer.
                </p>
              ) : (
                <ul className="space-y-2">
                  {template.layers
                    .map((layer, index) => ({ layer, index }))
                    .slice()
                    .reverse()
                    .map(({ layer, index }) => (
                      <li
                        key={layer.id}
                        className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 cursor-pointer \
${
  selectedLayer === layer.id
    ? "border-brand-300 bg-brand-50 dark:border-gray-700 dark:bg-white/[0.06]"
    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
}`}
                        onClick={() => setSelectedLayer(layer.id)}
                        title={`Layer ${template.layers.length - index}`}
                      >
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {layer.type === "text" ? "T" : "IMG"}
                        </span>
                        <span className="flex-1 truncate text-gray-900 dark:text-white/90">
                          {layer.type === "text" ? layer.content : "Image"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(layer.id, "up");
                            }}
                            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.06]"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(layer.id, "down");
                            }}
                            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.06]"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLayer(layer.id);
                            }}
                            className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <h2 className="font-semibold text-gray-900 dark:text-white/90 mb-4">Properties</h2>
            {selectedLayerData ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">X Position</label>
                  <input
                    type="number"
                    value={selectedLayerData.x}
                    onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'x', parseInt(e.target.value || '0'))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Y Position</label>
                  <input
                    type="number"
                    value={selectedLayerData.y}
                    onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'y', parseInt(e.target.value || '0'))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                {selectedLayerData.type === 'text' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Text</label>
                      <input
                        type="text"
                        value={selectedLayerData.content}
                        onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'content', e.target.value || '')}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Font Size</label>
                      <input
                        type="number"
                        value={selectedLayerData.fontSize}
                        onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'fontSize', parseInt(e.target.value || '0'))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Color</label>
                      <input
                        type="color"
                        value={selectedLayerData.color}
                        onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'color', e.target.value || '')}
                        className="w-full p-1 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  </>
                )}

                {selectedLayerData.type === 'image' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Width</label>
                      <input
                        type="number"
                        value={selectedLayerData.width}
                        onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'width', parseInt(e.target.value || '100'))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Height</label>
                      <input
                        type="number"
                        value={selectedLayerData.height}
                        onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'height', parseInt(e.target.value || '100'))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedLayerData.opacity}
                    onChange={(e) => selectedLayer && updateLayerProperty(selectedLayer, 'opacity', parseFloat(e.target.value || '1'))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    {Math.round((selectedLayerData.opacity || 1) * 100)}%
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Select a layer to edit properties</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;