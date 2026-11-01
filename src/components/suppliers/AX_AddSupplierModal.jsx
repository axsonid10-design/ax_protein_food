import React from 'react'
import { AX_SupplierModal } from './AX_SupplierModal'

export function AX_AddSupplierModal({ isOpen, onClose }) {
  return <AX_SupplierModal isOpen={isOpen} onClose={onClose} supplier={null} />
}

export default AX_AddSupplierModal
