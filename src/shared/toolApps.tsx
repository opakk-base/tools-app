import type { ReactNode } from "react";
import { FileIcon, GridIcon, UserCircleIcon } from "../icons";
import { Maximize2, Merge, Scan, Scissors, Edit3, FilePlus, Wand2 } from "lucide-react";

export type ToolApp = {
  name: string;
  path: string;
  description: string;
  icon: ReactNode;
  new?: boolean;
  pro?: boolean;
};

export type ToolGroup = {
  id: string;
  label: string;
  items: ToolApp[];
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "text",
    label: "Text Tools",
    items: [
      {
        name: "Encode Decode",
        path: "/encode-decode",
        description: "Encode/decode text dalam berbagai format.",
        icon: <GridIcon />,
      },
    ],
  },
  {
    id: "image",
    label: "Image Tools",
    items: [
      {
        name: "Image Resizer",
        path: "/image-resize",
        description: "Resize, rotate, dan konversi gambar.",
        icon: <Maximize2 />,
      },
    ],
  },
  {
    id: "pdf",
    label: "PDF Tools",
    items: [
      {
        name: "PDF Merge",
        path: "/pdf-merge",
        description: "Merge beberapa file PDF menjadi satu.",
        icon: <Merge />,
      },
      {
        name: "PDF Split",
        path: "/pdf-split",
        description: "Split PDF menjadi beberapa file.",
        icon: <Scissors />,
      },
      {
        name: "PDF Compress",
        path: "/pdf-compress",
        description: "Compress PDF untuk perkecil ukuran file.",
        icon: <Scan />,
      },
      {
        name: "PDF Editor",
        path: "/pdf-editor",
        description: "Edit PDF: tambah text, gambar, dan bentuk.",
        icon: <Edit3 />,
        new: true,
      },
      {
        name: "PDF Embed",
        path: "/pdf-embed",
        description: "Sisipkan halaman dari satu PDF ke PDF lain.",
        icon: <FilePlus />,
        new: true,
      },
      {
        name: "PDF Enhance",
        path: "/pdf-enhance",
        description: "Tingkatkan kualitas PDF scan dengan filter.",
        icon: <Wand2 />,
        new: true,
      },
    ],
  },
  {
    id: "generator",
    label: "Generators",
    items: [
      {
        name: "Generate Certificate",
        path: "/generate-certificate",
        description: "Generate sertifikat sederhana dari template.",
        icon: <FileIcon />,
      },
    ],
  },
  {
    id: "info",
    label: "Info",
    items: [
      {
        name: "About Me",
        path: "/about-me",
        description: "Profil Opakk (redirect ke opakk.id).",
        icon: <UserCircleIcon />,
      },
    ],
  },
];

export const TOOL_APPS: ToolApp[] = TOOL_GROUPS.flatMap((group) => group.items);
