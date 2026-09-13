/**
 * PDF export for the monthly report (Modification #5 — client-side). expo-print
 * renders the HTML to a PDF; it is then shared through the system share sheet or
 * written into a folder the user picks.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { MonthKey } from '@/lib/date';

// A4 in expo-print's page unit (72 PPI).
const A4 = { width: 595, height: 842 };

export const reportFileName = (monthKey: MonthKey) => `FinTrack-Report-${monthKey}.pdf`;

/**
 * Renders the report and returns the PDF as base64. The file expo-print writes can't
 * be read back through expo-file-system in Expo Go ("Missing 'READ' permission"),
 * so the content is taken from the print result instead.
 */
async function renderPdfBase64(html: string): Promise<string> {
  const { base64 } = await Print.printToFileAsync({ html, base64: true, ...A4 });
  if (!base64) throw new Error('PDF তৈরি হয়নি, আবার চেষ্টা করুন।');
  return base64;
}

/** Opens the share sheet with the PDF (WhatsApp, Gmail, Drive, Save to Files…). */
export async function shareReportPdf(html: string, monthKey: MonthKey): Promise<void> {
  // Web can't hand out a PDF file; the browser's print dialog offers "Save as PDF".
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('এই ডিভাইসে শেয়ার করার সুবিধা নেই।');
  // A readable file name in our own cache — share targets show it.
  const file = new File(Paths.cache, reportFileName(monthKey));
  if (!file.exists) file.create();
  file.write(await renderPdfBase64(html), { encoding: 'base64' });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: reportFileName(monthKey),
  });
}

export type SaveResult = { status: 'saved'; folder: string } | { status: 'cancelled' } | { status: 'printed' };

/** Saves the PDF into a folder the user picks (e.g. a folder inside Download). */
export async function saveReportPdf(html: string, monthKey: MonthKey): Promise<SaveResult> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return { status: 'printed' };
  }
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (e) {
    // Closing the folder picker rejects — nothing to save.
    console.warn('[report] folder picker closed:', e);
    return { status: 'cancelled' };
  }
  const pdf = await renderPdfBase64(html);
  folder.createFile(reportFileName(monthKey), 'application/pdf').write(pdf, { encoding: 'base64' });
  return { status: 'saved', folder: folder.name };
}
