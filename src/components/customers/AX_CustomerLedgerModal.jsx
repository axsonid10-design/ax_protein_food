import React from 'react'
import { AX_CustomerDetailsModal } from './AX_CustomerDetailsModal'

export function AX_CustomerLedgerModal({ customer, isOpen, onClose }) {
  return <AX_CustomerDetailsModal customer={customer} isOpen={isOpen} onClose={onClose} />
}

export default AX_CustomerLedgerModal
