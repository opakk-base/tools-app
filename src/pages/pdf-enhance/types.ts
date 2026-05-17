export interface FilterSettings {
  brightness: number;
  contrast: number;
  sharpen: number;
  despeckle: number;
  grayscale: boolean;
  blackWhite: boolean;
  autoRotate: boolean;
}

export const DEFAULT_FILTERS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  sharpen: 0,
  despeckle: 0,
  grayscale: false,
  blackWhite: false,
  autoRotate: false,
};

export const PRESET_DOCUMENT: FilterSettings = {
  brightness: 10,
  contrast: 20,
  sharpen: 5,
  despeckle: 2,
  grayscale: true,
  blackWhite: false,
  autoRotate: false,
};

export const PRESET_RECEIPT: FilterSettings = {
  brightness: 20,
  contrast: 30,
  sharpen: 10,
  despeckle: 3,
  grayscale: true,
  blackWhite: false,
  autoRotate: false,
};

export const PRESET_PHOTO: FilterSettings = {
  brightness: 0,
  contrast: 10,
  sharpen: 15,
  despeckle: 1,
  grayscale: false,
  blackWhite: false,
  autoRotate: false,
};

export const PRESET_OLD_PAPER: FilterSettings = {
  brightness: 5,
  contrast: 15,
  sharpen: 8,
  despeckle: 4,
  grayscale: true,
  blackWhite: false,
  autoRotate: false,
};

export type PresetName = "document" | "receipt" | "photo" | "old_paper" | "custom";

export const PRESETS: Record<string, { name: string; settings: FilterSettings }> = {
  document: { name: "Document", settings: PRESET_DOCUMENT },
  receipt: { name: "Receipt", settings: PRESET_RECEIPT },
  photo: { name: "Photo", settings: PRESET_PHOTO },
  old_paper: { name: "Old Paper", settings: PRESET_OLD_PAPER },
  custom: { name: "Custom", settings: DEFAULT_FILTERS },
};
