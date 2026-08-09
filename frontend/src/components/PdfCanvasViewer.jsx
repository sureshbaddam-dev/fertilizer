import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up worker CDN source matching pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfCanvasViewer({ pdfDoc }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    async function loadPdfPages() {
      try {
        setLoading(true);
        const arrayBuffer = pdfDoc.output('arraybuffer');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        const loadedPages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          loadedPages.push(page);
        }

        if (!isCancelled) {
          setPages(loadedPages);
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF.js render error:', err);
        if (!isCancelled) setLoading(false);
      }
    }

    loadPdfPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc]);

  return (
    <div
      className="w-full h-full bg-slate-200/90 p-4 space-y-6 scrollbar-thin"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        overflow: 'auto',
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500 font-medium text-xs">
          Rendering PDF pages...
        </div>
      ) : (
        pages.map((page, index) => (
          <PdfPageCanvas key={index} page={page} />
        ))
      )}
    </div>
  );
}

function PdfPageCanvas({ page }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!page || !canvasRef.current) return;
    let renderTask = null;

    // Scale 1.33 for high crisp 100% A4 document rendering
    const viewport = page.getViewport({ scale: 1.33 });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    renderTask = page.render(renderContext);

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [page]);

  return (
    <div className="bg-white shadow-2xl rounded-xs border border-gray-300 overflow-hidden shrink-0 mx-auto my-2">
      <canvas ref={canvasRef} className="block max-w-full h-auto" />
    </div>
  );
}
