import type { ReactNode } from "react";
import { FileIcon, GridIcon } from "../icons";

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
];
