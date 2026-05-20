export type ToolType = "select" | "hand" | "text" | "image" | "rectangle" | "circle" | "line";

export interface BaseAnnotation {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  name?: string;
  visible?: boolean;
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: "image";
  imageData: string;
  opacity: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: "rectangle" | "circle" | "line";
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  x2?: number;
  y2?: number;
}

export type Annotation = TextAnnotation | ImageAnnotation | ShapeAnnotation;

export interface PDFEditorState {
  file: File | null;
  pageCount: number;
  currentPage: number;
  annotations: Record<number, Annotation[]>;
  selectedTool: ToolType;
  selectedAnnotation: string | null;
  history: Record<number, Annotation[][]>;
  historyIndex: Record<number, number>;
}

export const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
];

export const DEFAULT_TEXT_PROPS = {
  text: "Text",
  fontFamily: "Arial",
  fontSize: 24,
  color: "#000000",
  bold: false,
  italic: false,
};

export const DEFAULT_SHAPE_PROPS = {
  fillColor: "#3b82f6",
  borderColor: "#1d4ed8",
  borderWidth: 2,
};
