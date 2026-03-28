/**
 * EXIF GPS 데이터 추출
 * JPEG APP1 (0xFFE1) → TIFF IFD → GPSInfo (tag 0x8825)
 * 경량 구현: GPS latitude/longitude + DateTimeOriginal만 추출
 */

export interface ExifData {
  gps: { latitude: number; longitude: number } | null
  capturedAt: string | null
  hasGps: boolean
}

export async function parseExifFromBase64(base64: string): Promise<ExifData> {
  try {
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    return parseExifBuffer(bytes.buffer)
  } catch {
    return { gps: null, capturedAt: null, hasGps: false }
  }
}

export async function extractExifFromFile(file: File): Promise<ExifData> {
  try {
    const buffer = await file.arrayBuffer()
    return parseExifBuffer(buffer)
  } catch {
    return { gps: null, capturedAt: null, hasGps: false }
  }
}

function parseExifBuffer(buffer: ArrayBuffer): ExifData {
  const view = new DataView(buffer)

  // JPEG SOI marker
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return { gps: null, capturedAt: null, hasGps: false }
  }

  // Find APP1 (EXIF) marker
  let offset = 2
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset)
    if (marker === 0xffe1) {
      const length = view.getUint16(offset + 2)
      // Check "Exif\0\0" header
      if (
        offset + 10 < view.byteLength &&
        view.getUint32(offset + 4) === 0x45786966 && // "Exif"
        view.getUint16(offset + 8) === 0x0000
      ) {
        const tiffStart = offset + 10
        return parseTiff(buffer, tiffStart)
      }
      offset += 2 + length
    } else if ((marker & 0xff00) === 0xff00) {
      offset += 2 + view.getUint16(offset + 2)
    } else {
      break
    }
  }

  return { gps: null, capturedAt: null, hasGps: false }
}

function parseTiff(buffer: ArrayBuffer, tiffStart: number): ExifData {
  const view = new DataView(buffer)
  const bigEndian = view.getUint16(tiffStart) === 0x4d4d // "MM"

  const getU16 = (off: number) => view.getUint16(off, !bigEndian)
  const getU32 = (off: number) => view.getUint32(off, !bigEndian)

  let gps: ExifData['gps'] = null
  let capturedAt: string | null = null

  // IFD0
  const ifd0Offset = tiffStart + getU32(tiffStart + 4)
  const ifd0Count = getU16(ifd0Offset)

  let gpsIfdPointer = 0
  let exifIfdPointer = 0

  for (let i = 0; i < ifd0Count; i++) {
    const entryOff = ifd0Offset + 2 + i * 12
    if (entryOff + 12 > buffer.byteLength) break
    const tag = getU16(entryOff)
    if (tag === 0x8825) { // GPSInfo
      gpsIfdPointer = tiffStart + getU32(entryOff + 8)
    } else if (tag === 0x8769) { // ExifIFD
      exifIfdPointer = tiffStart + getU32(entryOff + 8)
    }
  }

  // ExifIFD — DateTimeOriginal (0x9003)
  if (exifIfdPointer > 0 && exifIfdPointer + 2 < buffer.byteLength) {
    const exifCount = getU16(exifIfdPointer)
    for (let i = 0; i < exifCount; i++) {
      const entryOff = exifIfdPointer + 2 + i * 12
      if (entryOff + 12 > buffer.byteLength) break
      const tag = getU16(entryOff)
      if (tag === 0x9003) { // DateTimeOriginal
        const strOffset = tiffStart + getU32(entryOff + 8)
        if (strOffset + 19 <= buffer.byteLength) {
          const bytes = new Uint8Array(buffer, strOffset, 19)
          const raw = String.fromCharCode(...bytes)
          capturedAt = raw.slice(0, 10).replace(/:/g, '-') + 'T' + raw.slice(11) + 'Z'
        }
      }
    }
  }

  // GPSInfo IFD
  if (gpsIfdPointer > 0 && gpsIfdPointer + 2 < buffer.byteLength) {
    const gpsCount = getU16(gpsIfdPointer)
    let latRef = 'N'
    let lngRef = 'E'
    let latValues: number[] = []
    let lngValues: number[] = []

    for (let i = 0; i < gpsCount; i++) {
      const entryOff = gpsIfdPointer + 2 + i * 12
      if (entryOff + 12 > buffer.byteLength) break
      const tag = getU16(entryOff)

      if (tag === 1) { // GPSLatitudeRef
        latRef = String.fromCharCode(view.getUint8(entryOff + 8))
      } else if (tag === 2) { // GPSLatitude (3 RATIONAL)
        latValues = readRationals(view, tiffStart + getU32(entryOff + 8), 3, bigEndian)
      } else if (tag === 3) { // GPSLongitudeRef
        lngRef = String.fromCharCode(view.getUint8(entryOff + 8))
      } else if (tag === 4) { // GPSLongitude (3 RATIONAL)
        lngValues = readRationals(view, tiffStart + getU32(entryOff + 8), 3, bigEndian)
      }
    }

    if (latValues.length === 3 && lngValues.length === 3) {
      const lat = dmsToDecimal(latValues[0], latValues[1], latValues[2], latRef)
      const lng = dmsToDecimal(lngValues[0], lngValues[1], lngValues[2], lngRef)
      if (isFinite(lat) && isFinite(lng)) {
        gps = { latitude: lat, longitude: lng }
      }
    }
  }

  return { gps, capturedAt, hasGps: gps !== null }
}

function readRationals(view: DataView, offset: number, count: number, bigEndian: boolean): number[] {
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const off = offset + i * 8
    if (off + 8 > view.byteLength) break
    const num = view.getUint32(off, !bigEndian)
    const den = view.getUint32(off + 4, !bigEndian)
    result.push(den === 0 ? 0 : num / den)
  }
  return result
}

function dmsToDecimal(d: number, m: number, s: number, ref: string): number {
  const decimal = d + m / 60 + s / 3600
  return ref === 'S' || ref === 'W' ? -decimal : decimal
}
