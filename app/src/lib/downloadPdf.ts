import type jsPDF from 'jspdf';
import { toast } from 'sonner';

/**
 * Save or download a PDF. On web: triggers browser download.
 * On Android/iOS: writes to app Documents/Download folder (no share sheet).
 */
export async function savePdf(doc: jsPDF, filename: string): Promise<void> {
  const platform = getPlatform();
  if (platform === 'web') {
    triggerWebDownload(doc, filename);
  } else {
    const fileUri = await savePdfNative(doc, filename);
    toast.success(filename, {
      description: 'Fichier enregistré — Appuyez pour ouvrir',
      duration: 6000,
      position: 'bottom-right',
      icon: '📄',
      style: { background: '#059669', color: '#fff', borderColor: '#059669', cursor: 'pointer' },
      descriptionClassName: '!text-emerald-100',
      action: fileUri
        ? {
            label: 'Ouvrir',
            onClick: async () => {
              try {
                const { FileOpener } = await import('@capacitor-community/file-opener');
                await FileOpener.open({ filePath: fileUri, contentType: 'application/pdf' });
              } catch {
                // Fallback to share if file opener fails
                const { Share } = await import('@capacitor/share');
                await Share.share({ url: fileUri, title: filename, dialogTitle: filename });
              }
            },
          }
        : undefined,
    });
  }
}

function getPlatform(): 'web' | 'native' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as unknown as { Capacitor?: { getPlatform: () => string } }).Capacitor;
  if (cap?.getPlatform?.() === 'web') return 'web';
  if (cap?.getPlatform?.()) return 'native';
  return 'web';
}

function triggerWebDownload(doc: jsPDF, filename: string): void {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function savePdfNative(doc: jsPDF, filename: string): Promise<string | null> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const base64 = doc.output('datauristring').split(',')[1];
  if (!base64) return null;

  const path = `Odicam/${filename}`;
  try {
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Documents });
    return uri;
  } catch {
    // Fallback: write to Cache directory (works without storage permission)
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    return uri;
  }
}
