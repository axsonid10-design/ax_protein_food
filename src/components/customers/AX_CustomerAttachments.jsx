import React from 'react'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import { uploadImage, getTransformedUrl } from '../../services/imageKitService'
import { showToast } from '../common/AX_Toast'

export function AX_CustomerAttachments({
  attachments = [],
  setAttachments,
  isUploading,
  setIsUploading,
}) {
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setIsUploading(true)
    try {
      for (const file of files) {
        const uploaded = await uploadImage(file, '/customers')
        setAttachments((prev) => [...prev, uploaded])
      }
      showToast('تم رفع المستند بنجاح', 'success')
    } catch {
      showToast('تعذر رفع المستند', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-on-surface flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          مستندات وصور العميل (ImageKit)
        </span>
        <span className="text-[11px] text-on-surface-variant">سجل، بطاقة ضريبية، واجهة</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/5 text-xs font-bold transition-all">
          <Upload className="w-3.5 h-3.5" />
          <span>{isUploading ? 'جاري الرفع...' : 'رفع مستند'}</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            disabled={isUploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {attachments.map((att, idx) => {
          const thumb = att.thumbnailUrl || att.url
          const displayThumb = thumb ? getTransformedUrl(thumb, { width: 80, height: 80, quality: 75 }) : thumb
          return (
            <div key={idx} className="relative group w-12 h-12 rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-low flex items-center justify-center">
              {thumb ? (
                <img src={displayThumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-on-surface-variant" />
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AX_CustomerAttachments
