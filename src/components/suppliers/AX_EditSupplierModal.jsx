import React from 'react'
import { AX_SupplierModal } from './AX_SupplierModal'

export function AX_EditSupplierModal({ supplier, isOpen, onClose }) {
  return <AX_SupplierModal isOpen={isOpen} onClose={onClose} supplier={supplier} />
}

export default AX_EditSupplierModal
