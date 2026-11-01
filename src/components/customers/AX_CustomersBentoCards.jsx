import React from 'react'
import { AX_CustomerBentoCard } from './AX_CustomerBentoCard'

export function AX_CustomersBentoCards({
  customers = [],
  onOpenDetails,
  onOpenLedger,
  onEditCustomer,
  onDeleteCustomer,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
      {customers.map((c) => (
        <AX_CustomerBentoCard
          key={c.id}
          customer={c}
          onOpenDetails={onOpenDetails}
          onOpenLedger={onOpenLedger}
          onEditCustomer={onEditCustomer}
          onDeleteCustomer={onDeleteCustomer}
        />
      ))}
    </div>
  )
}

export default AX_CustomersBentoCards
