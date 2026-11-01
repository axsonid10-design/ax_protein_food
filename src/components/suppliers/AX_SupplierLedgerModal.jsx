import React from 'react'
import { AX_SupplierDetailsModal } from './AX_SupplierDetailsModal'

export function AX_SupplierLedgerModal({ supplier, isOpen, onClose }) {
  return <AX_SupplierDetailsModal supplier={supplier} isOpen={isOpen} onClose={onClose} />
}

export default AX_SupplierLedgerModal
