import React from 'react'
import { AX_SupplierBentoCard } from './AX_SupplierBentoCard'

export function AX_SuppliersBentoCards({
  suppliers = [],
  onOpenDetails,
  onOpenLedger,
  onEditSupplier,
  onDeleteSupplier,
}) {
  const handleDetails = onOpenDetails || onOpenLedger

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
      {suppliers.map((s) => (
        <AX_SupplierBentoCard
          key={s.id}
          supplier={s}
          onOpenDetails={handleDetails}
          onEditSupplier={onEditSupplier}
          onDeleteSupplier={onDeleteSupplier}
        />
      ))}
    </div>
  )
}

export default AX_SuppliersBentoCards
