import type { ReactNode } from "react";
import { FileIcon, GridIcon, UserCircleIcon } from "../icons";
import { Maximize2, Merge } from "lucide-react";

export type ToolApp = {
  name: string;
  path: string;
  description: string;
  icon: ReactNode;
};

export const TOOL_APPS: ToolApp[] = [
  {
    name: "Encode Decode",
    path: "/encode-decode",
    description: "Encode/decode text dalam berbagai format.",
    icon: <GridIcon />,
  },
  {
    name: "Generate Certificate",
    path: "/generate-certificate",
    description: "Generate sertifikat sederhana dari template.",
    icon: <FileIcon />,
  },
  {
    name: "About Me",
    path: "/about-me",
    description: "Profil Opakk (redirect ke opakk.id).",
    icon: <UserCircleIcon />,
  },
  {
    name: "Image Resizer",
    path: "/image-resize",
    description: "Resize, rotate, dan konversi gambar.",
    icon: <Maximize2 />,
  },
  {
    name: "PDF Merge",
    path: "/pdf-merge",
    description: "Merge beberapa file PDF menjadi satu.",
    icon: <Merge />,
  },
];
