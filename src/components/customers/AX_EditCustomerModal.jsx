import React from 'react'
import { AX_CustomerModal } from './AX_CustomerModal'

export function AX_EditCustomerModal({ customer, isOpen, onClose }) {
  return <AX_CustomerModal isOpen={isOpen} onClose={onClose} customer={customer} />
}

export default AX_EditCustomerModal
