export interface CertificateLayer {
  id: string;
  type: 'text' | 'image';
  content: string; // text content or image URL
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  rotation?: number;
  opacity?: number;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  backgroundImage: string;
  layers: CertificateLayer[];
  width: number;
  height: number;
}