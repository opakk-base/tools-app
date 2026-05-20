import type { Annotation } from "./types";

export function bringToFront(items: Annotation[], id: string): Annotation[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1 || index === items.length - 1) return items;
  const newItems = [...items];
  const [item] = newItems.splice(index, 1);
  newItems.push(item);
  return newItems;
}

export function sendToBack(items: Annotation[], id: string): Annotation[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1 || index === 0) return items;
  const newItems = [...items];
  const [item] = newItems.splice(index, 1);
  newItems.unshift(item);
  return newItems;
}

export function bringForward(items: Annotation[], id: string): Annotation[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1 || index === items.length - 1) return items;
  const newItems = [...items];
  [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
  return newItems;
}

export function sendBackward(items: Annotation[], id: string): Annotation[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1 || index === 0) return items;
  const newItems = [...items];
  [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
  return newItems;
}

export function reorder(items: Annotation[], fromIndex: number, toIndex: number): Annotation[] {
  if (fromIndex === toIndex) return items;
  const newItems = [...items];
  const [item] = newItems.splice(fromIndex, 1);
  newItems.splice(toIndex, 0, item);
  return newItems;
}

export function getDisplayName(annotation: Annotation): string {
  if (annotation.name) return annotation.name;
  switch (annotation.type) {
    case "text":
      return annotation.text ? `Text: ${annotation.text.slice(0, 20)}${annotation.text.length > 20 ? "..." : ""}` : "Text";
    case "image":
      return "Image";
    case "rectangle":
      return "Rectangle";
    case "circle":
      return "Circle";
    case "line":
      return "Line";
    default:
      return "Annotation";
  }
}

export function canBringToFront(items: Annotation[], id: string): boolean {
  const index = items.findIndex((item) => item.id === id);
  return index !== -1 && index !== items.length - 1;
}

export function canSendToBack(items: Annotation[], id: string): boolean {
  const index = items.findIndex((item) => item.id === id);
  return index !== -1 && index !== 0;
}

export function canBringForward(items: Annotation[], id: string): boolean {
  const index = items.findIndex((item) => item.id === id);
  return index !== -1 && index !== items.length - 1;
}

export function canSendBackward(items: Annotation[], id: string): boolean {
  const index = items.findIndex((item) => item.id === id);
  return index !== -1 && index !== 0;
}
