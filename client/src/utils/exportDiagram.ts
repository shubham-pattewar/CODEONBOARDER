import { toPng, toSvg } from 'html-to-image';

export async function exportCanvasAsPng(filename = 'architecture-diagram.png'): Promise<void> {
  const node = document.querySelector('.react-flow__viewport') as HTMLElement || 
               document.getElementById('flow-canvas-container');

  if (!node) {
    throw new Error('Canvas element not found for export');
  }

  const isDark = document.documentElement.classList.contains('dark');
  const backgroundColor = isDark ? '#09090b' : '#f8fafc';

  const dataUrl = await toPng(node, {
    backgroundColor,
    quality: 0.95,
    filter: (domNode) => {
      // Exclude controls and overlays from screenshot
      const el = domNode as HTMLElement;
      if (el.classList?.contains('react-flow__controls') || el.classList?.contains('react-flow__minimap')) {
        return false;
      }
      return true;
    },
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportCanvasAsSvg(filename = 'architecture-diagram.svg'): Promise<void> {
  const node = document.querySelector('.react-flow__viewport') as HTMLElement || 
               document.getElementById('flow-canvas-container');

  if (!node) {
    throw new Error('Canvas element not found for export');
  }

  const isDark = document.documentElement.classList.contains('dark');
  const backgroundColor = isDark ? '#09090b' : '#f8fafc';

  const dataUrl = await toSvg(node, {
    backgroundColor,
    filter: (domNode) => {
      const el = domNode as HTMLElement;
      if (el.classList?.contains('react-flow__controls') || el.classList?.contains('react-flow__minimap')) {
        return false;
      }
      return true;
    },
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function downloadTextFile(content: string, filename = 'architecture.mmd'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
