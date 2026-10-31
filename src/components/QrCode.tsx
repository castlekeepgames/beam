import { useMemo } from 'react'
import { encode } from 'uqr'
import { qrErrorCorrection, qrPath } from '../lib/qr'

/**
 * Dark modules on a white card (with quiet zone) so it scans in dark mode too.
 * Only imported by lazily loaded dialogs, so the encoder stays out of the main bundle.
 */
export function QrCode({ value }: { value: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(value, { ecc: qrErrorCorrection(value), border: 0 })
    return { path: qrPath(qr.data), size: qr.size }
  }, [value])
  const quiet = 4
  return (
    // Bigger on wider screens: dense codes scan far more reliably when large.
    <div className="w-full max-w-72 rounded-xl bg-white p-2 sm:max-w-md">
      <svg
        viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
        className="block h-auto w-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label="QR code"
      >
        <rect x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} fill="#fff" />
        <path d={path} fill="#000" />
      </svg>
    </div>
  )
}
