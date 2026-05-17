import type { FilterSettings } from "./types";

export function applyBrightness(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const adjustment = (value / 100) * 255;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
  }
  
  return imageData;
}

export function applyContrast(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }
  
  return imageData;
}

export function applyGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  return imageData;
}

export function applyBlackWhite(imageData: ImageData, threshold: number = 128): ImageData {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const bw = gray > threshold ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }
  
  return imageData;
}

export function applySharpen(
  imageData: ImageData,
  strength: number
): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  const kernelStrength = strength / 10;
  const kernel = [
    [0, -kernelStrength, 0],
    [-kernelStrength, 1 + 4 * kernelStrength, -kernelStrength],
    [0, -kernelStrength, 0],
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[ky + 1][kx + 1];
          }
        }
        output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  
  for (let i = 0; i < width * 4; i++) {
    output[i] = data[i];
    output[(height - 1) * width * 4 + i] = data[(height - 1) * width * 4 + i];
  }
  
  return new ImageData(output, width, height);
}

export function applyDespeckle(imageData: ImageData, level: number): ImageData {
  if (level === 0) return imageData;
  
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const radius = Math.min(level, 3);
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      for (let c = 0; c < 3; c++) {
        const values: number[] = [];
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            values.push(data[idx]);
          }
        }
        values.sort((a, b) => a - b);
        output[(y * width + x) * 4 + c] = values[Math.floor(values.length / 2)];
      }
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  
  for (let i = 0; i < data.length; i++) {
    if (output[i] === undefined) output[i] = data[i];
  }
  
  return new ImageData(output, width, height);
}

export function applyFilters(
  canvas: HTMLCanvasElement,
  settings: FilterSettings
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  if (settings.brightness !== 0) {
    imageData = applyBrightness(imageData, settings.brightness);
  }
  
  if (settings.contrast !== 0) {
    imageData = applyContrast(imageData, settings.contrast);
  }
  
  if (settings.sharpen > 0) {
    imageData = applySharpen(imageData, settings.sharpen);
  }
  
  if (settings.despeckle > 0) {
    imageData = applyDespeckle(imageData, settings.despeckle);
  }
  
  if (settings.grayscale) {
    imageData = applyGrayscale(imageData);
  }
  
  if (settings.blackWhite) {
    imageData = applyBlackWhite(imageData);
  }
  
  ctx.putImageData(imageData, 0, 0);
}
