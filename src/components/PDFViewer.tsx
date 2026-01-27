'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Spinner } from '@/components/ui'

interface PDFViewerProps {
  src: string
  title?: string
}

export default function PDFViewer({ src, title = 'PDF' }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Try to detect page count from PDF (this works in some browsers)
  useEffect(() => {
    const detectPages = async () => {
      try {
        // Fetch PDF to get page count via PDF header parsing
        const response = await fetch(src)
        const blob = await response.blob()
        const text = await blob.text()

        // Simple regex to find page count in PDF metadata
        const pageMatch = text.match(/\/Count\s+(\d+)/)
        if (pageMatch) {
          setTotalPages(parseInt(pageMatch[1], 10))
        }
      } catch (e) {
        // Fallback: can't detect page count
        console.log('Could not detect PDF page count')
      }
    }

    detectPages()
  }, [src])

  const handleIframeLoad = () => {
    setLoading(false)
    setPdfLoaded(true)
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (totalPages === 0 || currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  // Build PDF URL with page and zoom parameters
  const getPdfUrl = () => {
    const zoomPercent = Math.round(scale * 100)
    return `${src}#page=${currentPage}&zoom=${zoomPercent}&toolbar=0&navpanes=0&scrollbar=0&view=Fit`
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary-100 border-b border-secondary-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <span className="text-sm text-secondary-700 min-w-[100px] text-center">
            Seite {currentPage}{totalPages > 0 ? ` von ${totalPages}` : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={totalPages > 0 && currentPage >= totalPages}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </Button>
          <span className="text-sm text-secondary-600 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(src, '_blank')}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Öffnen
        </Button>
      </div>

      {/* PDF Container */}
      <div className="flex-1 relative bg-secondary-200">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Spinner size="lg" />
            <span className="ml-3 text-secondary-600">PDF wird geladen...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={`${currentPage}-${scale}`}
          src={getPdfUrl()}
          className="w-full h-full bg-white"
          title={title}
          onLoad={handleIframeLoad}
          style={{
            border: 'none',
            minHeight: '60vh'
          }}
        />
      </div>

      {/* Page Navigation Footer */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary-50 border-t border-secondary-200 rounded-b-lg">
        <input
          type="number"
          min={1}
          max={totalPages > 0 ? totalPages : undefined}
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value)
            if (page >= 1 && (totalPages === 0 || page <= totalPages)) {
              setCurrentPage(page)
            }
          }}
          className="w-16 px-2 py-1 text-center border border-secondary-300 rounded text-sm"
        />
        {totalPages > 0 && (
          <span className="text-sm text-secondary-500">/ {totalPages}</span>
        )}
      </div>
    </div>
  )
}
