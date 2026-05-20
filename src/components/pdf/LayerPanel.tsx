import { GripVertical, Eye, EyeOff, Trash2, Type, Image, Square, Circle, Minus } from "lucide-react";
import type { Annotation } from "../../pages/pdf-editor/types";
import { getDisplayName } from "../../pages/pdf-editor/layerUtils";

interface LayerPanelProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}

function getTypeIcon(type: Annotation["type"]) {
  switch (type) {
    case "text":
      return <Type className="w-4 h-4" />;
    case "image":
      return <Image className="w-4 h-4" />;
    case "rectangle":
      return <Square className="w-4 h-4" />;
    case "circle":
      return <Circle className="w-4 h-4" />;
    case "line":
      return <Minus className="w-4 h-4" />;
    default:
      return null;
  }
}

export default function LayerPanel({
  annotations,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisibility,
  onDelete,
}: LayerPanelProps) {
  const reversedAnnotations = [...annotations].reverse();

  const handleDragStart = (e: React.DragEvent, reversedIndex: number) => {
    e.dataTransfer.setData("text/plain", String(reversedIndex));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetReversedIndex: number) => {
    e.preventDefault();
    const fromReversedIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (fromReversedIndex === targetReversedIndex) return;

    const fromIndex = annotations.length - 1 - fromReversedIndex;
    let toIndex = annotations.length - 1 - targetReversedIndex;

    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    onReorder(fromIndex, toIndex);
  };

  if (annotations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
        No annotations yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto">
      {reversedAnnotations.map((annotation, reversedIndex) => (
        <div
          key={annotation.id}
          draggable
          onDragStart={(e) => handleDragStart(e, reversedIndex)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, reversedIndex)}
          onClick={() => onSelect(annotation.id)}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
            selectedId === annotation.id
              ? "bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-indigo-500"
              : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          } ${annotation.visible === false ? "opacity-50" : ""}`}
        >
          <div className="cursor-grab shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="shrink-0 text-gray-500 dark:text-gray-400">
            {getTypeIcon(annotation.type)}
          </div>
          <div className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-200 truncate">
            {getDisplayName(annotation)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(annotation.id);
            }}
            className="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
            title={annotation.visible === false ? "Show" : "Hide"}
          >
            {annotation.visible === false ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(annotation.id);
            }}
            className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
