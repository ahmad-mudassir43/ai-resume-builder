import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Use a Vite-compatible worker URL to avoid CDN import issues
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const extractTextFromPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
};

export const extractTextFromDocx = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
};

export const extractTextFromTxt = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read TXT file'));
    reader.readAsText(file);
  });
};

export const convertPdfToImage = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  // Render the first page for recognition
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  return canvas.toDataURL('image/jpeg', 0.9);
};
