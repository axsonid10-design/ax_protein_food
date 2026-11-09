import * as htmlToImage from 'html-to-image'
import { axToast } from './axToast.js'

export async function getInvoiceImageBlob(element) {
  if (!element) throw new Error('عنصر الفاتورة غير موجود')

  const prevTransform = element.style.transform
  const prevTransition = element.style.transition
  const prevWidth = element.style.width
  const prevMinWidth = element.style.minWidth
  const prevMaxWidth = element.style.maxWidth

  element.style.transform = 'none'
  element.style.transition = 'none'
  element.style.width = '794px'
  element.style.minWidth = '794px'
  element.style.maxWidth = '794px'

  try {
    const targetWidth = 794
    const targetHeight = Math.max(1123, element.scrollHeight || 1123)
    const blob = await htmlToImage.toBlob(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      width: targetWidth,
      height: targetHeight,
      canvasWidth: targetWidth * 2,
      canvasHeight: targetHeight * 2,
      style: {
        transform: 'none',
        margin: '0',
        width: '794px',
        minWidth: '794px',
        maxWidth: '794px',
      },
    })
    if (!blob) throw new Error('فشل إنشاء ملف الصورة')
    return blob
  } finally {
    element.style.transform = prevTransform
    element.style.transition = prevTransition
    element.style.width = prevWidth
    element.style.minWidth = prevMinWidth
    element.style.maxWidth = prevMaxWidth
  }
}

export const captureInvoiceElement = getInvoiceImageBlob
export const captureInvoiceBlob = getInvoiceImageBlob

export async function downloadInvoiceImage(invoice, element) {
  try {
    const blob = await getInvoiceImageBlob(element)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = `فاتورة_${invoice?.code || 'بروتين_فود'}.png`
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    axToast.success(`تم تحميل صورة الفاتورة (${fileName}) بنجاح`)
    return true
  } catch (err) {
    axToast.error('تعذر تحميل صورة الفاتورة')
    return false
  }
}

export async function copyInvoiceImageToClipboard(element) {
  try {
    const blob = await getInvoiceImageBlob(element)
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])
      axToast.success('تم نسخ صورة الفاتورة للحافظة جاهزة للصق في واتساب (Ctrl+V)')
      return true
    } else {
      throw new Error('ClipboardItem غير مدعوم')
    }
  } catch (err) {
    axToast.error('تعذر نسخ الصورة للحافظة في هذا المتصفح')
    return false
  }
}

export async function shareInvoiceImageToWhatsApp(invoice, element) {
  try {
    const blob = await getInvoiceImageBlob(element)
    const fileName = `فاتورة_${invoice?.code || 'بروتين_فود'}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    const shareTitle = `فاتورة ${invoice?.code || ''}`
    const shareText = `فاتورة ${invoice?.code || ''} - ${invoice?.partyName || ''}\nالمبلغ: ${Number(invoice?.total || 0).toLocaleString('en-US')} ج.م\nبروتين فود`

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText,
      })
      axToast.success('تمت مشاركة صورة الفاتورة بنجاح')
      return true
    }

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        axToast.info('تم نسخ صورة الفاتورة للحافظة، يمكنك لصقها الآن في محادثة الواتساب')
      } catch (e) {
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, '_blank')
    axToast.success('تم تجهيز الصورة وفتح واتساب لمشاركتها')
    return true
  } catch (err) {
    if (err.name === 'AbortError') return false
    axToast.error('حدث خطأ أثناء مشاركة الفاتورة')
    return false
  }
}

export async function downloadTransferImage(transfer, element) {
  try {
    const blob = await getInvoiceImageBlob(element)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = `اذن_تحويل_${transfer?.code || 'بروتين_فود'}.png`
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    axToast.success(`تم تحميل صورة إذن التحويل (${fileName}) بنجاح`)
    return true
  } catch {
    axToast.error('تعذر تحميل صورة إذن التحويل')
    return false
  }
}

export async function shareTransferImageToWhatsApp(transfer, element, fromName = '', toName = '') {
  try {
    const blob = await getInvoiceImageBlob(element)
    const fileName = `اذن_تحويل_${transfer?.code || 'بروتين_فود'}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    const totalQty = (transfer?.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
    const shareTitle = `إذن تحويل مخزني ${transfer?.code || ''}`
    const shareText = `إذن تحويل مخزني ${transfer?.code || ''}\nمن: ${fromName || 'مخزن'}\nإلى: ${toName || 'مخزن'}\nعدد الأصناف: ${(transfer?.items || []).length} صنف (إجمالي ${totalQty} وحدة)\nبروتين فود`

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText,
      })
      axToast.success('تمت مشاركة إذن التحويل بنجاح')
      return true
    }

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        axToast.info('تم نسخ صورة إذن التحويل للحافظة، يمكنك لصقها الآن في محادثة الواتساب')
      } catch (e) {}
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, '_blank')
    axToast.success('تم تجهيز صورة الإذن وفتح واتساب لمشاركتها')
    return true
  } catch (err) {
    if (err.name === 'AbortError') return false
    axToast.error('حدث خطأ أثناء مشاركة إذن التحويل')
    return false
  }
}
