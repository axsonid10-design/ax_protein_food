const IMAGEKIT_ENDPOINT =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_IMAGEKIT_URL_ENDPOINT) ||
  'https://ik.imagekit.io/c8zctprqq'

const IMAGEKIT_PUBLIC_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_IMAGEKIT_PUBLIC_KEY) ||
  'public_xKb4EU48gwQEN3k+IkcmynMLljE='

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      resolve('')
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })

export function getTransformedUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url
  if (!url.includes('ik.imagekit.io')) return url

  const opts = options || {}
  const { width, w, height, h, quality, q, crop, c } = opts
  const targetW = width || w
  const targetH = height || h
  const targetQ = quality !== undefined ? quality : q
  const targetCrop = crop || c

  const trSegments = []
  if (targetW) trSegments.push(`w-${targetW}`)
  if (targetH) trSegments.push(`h-${targetH}`)
  if (targetQ !== undefined && targetQ !== null && targetQ !== '') {
    const numQ = Number(targetQ)
    if (!isNaN(numQ)) {
      const clampedQ = Math.max(1, Math.min(100, Math.round(numQ)))
      trSegments.push(`q-${clampedQ}`)
    }
  }
  if (targetCrop) trSegments.push(`c-${targetCrop}`)

  if (trSegments.length === 0) return url

  const trString = `tr:${trSegments.join(',')}`

  try {
    const parsed = new URL(url)
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    if (pathParts.length === 0) return url

    const endpointParts = new URL(IMAGEKIT_ENDPOINT).pathname.split('/').filter(Boolean)
    const endpointId = endpointParts[0] || pathParts[0]

    let afterEndpoint = pathParts
    if (pathParts[0] === endpointId) {
      afterEndpoint = pathParts.slice(1)
    }

    if (afterEndpoint.length > 0 && afterEndpoint[0].startsWith('tr:')) {
      afterEndpoint[0] = trString
    } else {
      afterEndpoint.unshift(trString)
    }

    parsed.pathname = `/${endpointId}/${afterEndpoint.join('/')}`
    return parsed.toString()
  } catch {
    return url
  }
}

export async function uploadImage(file, folder = '/customers') {
  if (!file) throw new Error('No file provided for upload')

  const fileName = file.name || `img_${Date.now()}`

  try {
    if (typeof fetch === 'function' && typeof FormData !== 'undefined' && navigator.onLine !== false) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', fileName)
      formData.append('publicKey', IMAGEKIT_PUBLIC_KEY)
      formData.append('folder', folder)
      formData.append('useUniqueFileName', 'true')

      const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return {
          url: data.url,
          fileId: data.fileId || `ik-${Date.now()}`,
          name: data.name || fileName,
          thumbnailUrl: data.thumbnailUrl || data.url,
          isLocalFallback: false,
        }
      }
    }
  } catch {}

  const base64Data = await readFileAsDataUrl(file)
  return {
    url: base64Data,
    fileId: `local-${Date.now()}`,
    name: fileName,
    thumbnailUrl: base64Data,
    isLocalFallback: true,
  }
}

export const imageKitService = {
  uploadImage,
  getTransformedUrl,
  endpoint: IMAGEKIT_ENDPOINT,
}

export default imageKitService
