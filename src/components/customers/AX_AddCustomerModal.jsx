import React from 'react'
import { AX_CustomerModal } from './AX_CustomerModal'

export function AX_AddCustomerModal({ isOpen, onClose }) {
  return <AX_CustomerModal isOpen={isOpen} onClose={onClose} customer={null} />
}

export default AX_AddCustomerModal
