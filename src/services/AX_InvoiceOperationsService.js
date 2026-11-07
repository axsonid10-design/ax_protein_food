import { supabase } from './supabaseClient.js'
import { generateUUID } from '../utils/AX_UUID.js'
import { AX_RecycleBinService } from './AX_RecycleBinService.js'
import { offlineDB } from './offlineDB.js'

export const AX_InvoiceOperationsService = {
  addInvoiceInDB: async (inv, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !inv) return { success: false }
    try {
      const invoiceId = inv.id || generateUUID()
      const isSaleReturn = inv.type === 'sale_return'
      const isPurchaseReturn = inv.type === 'purchase_return'
      const dbType = (isSaleReturn || inv.type === 'sale') ? 'sale' : 'purchase'
      const defaultTerms = isSaleReturn ? 'مردود مبيعات' : isPurchaseReturn ? 'مردود مشتريات' : (Number(inv.remainingAmount || 0) > 0 ? 'مدفوع جزئي' : 'مدفوع كلي')

      const invoiceRow = {
        id: invoiceId,
        code: inv.code || (isSaleReturn ? `RET-SALE-${Date.now().toString().slice(-4)}` : isPurchaseReturn ? `RET-PURCHASE-${Date.now().toString().slice(-4)}` : `INV-${Date.now().toString().slice(-5)}`),
        type: inv.type || dbType,
        party_name: inv.partyName || inv.party_name || '',
        party_type: inv.partyKind || inv.partyType || (dbType === 'sale' ? 'customer' : 'supplier'),
        party_id: inv.partyId || inv.party_id || null,
        warehouse_id: inv.warehouseId || inv.warehouse_id || null,
        transport_cost: Number(inv.transportCost || inv.transport_cost || 0),
        loading_cost: Number(inv.loadingCost || inv.loading_cost || 0),
        subtotal: Number(inv.subtotal || 0),
        tax: Number(inv.tax || 0),
        total: Number(inv.total || 0),
        paid_amount: Number(inv.paidAmount ?? inv.paid_amount ?? 0),
        remaining_amount: Number(inv.remainingAmount ?? inv.remaining_amount ?? 0),
        status: isSaleReturn ? 'sale_return' : isPurchaseReturn ? 'purchase_return' : (inv.status || 'completed'),
        date: inv.date || new Date().toISOString().split('T')[0],
        payment_terms: inv.paymentTerms || inv.payment_terms || defaultTerms,
        items: inv.items || [],
        notes: inv.notes || '',
      }
      const { error: invErr } = await supabase.from('ax_invoices').upsert(invoiceRow, { onConflict: 'id' })
      if (invErr) throw invErr

      if (inv.items && inv.items.length > 0 && invoiceRow.warehouse_id) {
        for (const item of inv.items) {
          const itemId = item.itemId || item.id
          const qty = Number(item.quantity || 0)
          if (!itemId || qty <= 0) continue
          const { data: stockRow } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', invoiceRow.warehouse_id).eq('item_id', itemId).maybeSingle()
          const delta = isSaleReturn ? qty : (isPurchaseReturn ? -qty : (dbType === 'sale' ? -qty : qty))
          if (stockRow) {
            const newQty = Number(stockRow.quantity || 0) + delta
            await supabase.from('ax_inventory_stock').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', stockRow.id)
          } else {
            await supabase.from('ax_inventory_stock').insert({ id: generateUUID(), warehouse_id: invoiceRow.warehouse_id, item_id: itemId, quantity: delta, unit: item.unit || 'كرتونة' })
          }
        }
      }

      if (invoiceRow.paid_amount > 0) {
        let tId = inv.treasuryId || inv.treasury_id || null
        if (!tId) {
          const { data: firstTr } = await supabase.from('ax_treasuries').select('id').order('created_at').limit(1).maybeSingle()
          tId = firstTr?.id || null
        }
        const isCashOut = (dbType === 'purchase' && !isPurchaseReturn) || isSaleReturn
        const txCode = (isCashOut ? 'PAY-' : 'REC-') + Date.now().toString().slice(-4)
        const txNotes = isSaleReturn
          ? `رد نقدية للعميل - مردود مبيعات ${invoiceRow.code}`
          : isPurchaseReturn
          ? `استرداد نقدية من المورد - مردود مشتريات ${invoiceRow.code}`
          : dbType === 'sale'
          ? `تحصيل نقدي - فاتورة مبيعات ${invoiceRow.code}`
          : `سداد نقدي - فاتورة مشتريات ${invoiceRow.code}`

        const txRow = {
          id: generateUUID(),
          code: txCode,
          type: isCashOut ? 'supplier_payment' : 'client_receipt',
          party_type: isSaleReturn || dbType === 'sale' ? 'client' : 'supplier',
          party_id: null,
          party_name: invoiceRow.party_name,
          amount: invoiceRow.paid_amount,
          treasury_id: tId,
          date: invoiceRow.date,
          notes: txNotes,
        }
        await supabase.from('ax_cash_transactions').insert(txRow)
        if (tId) {
          const { data: tr } = await supabase.from('ax_treasuries').select('*').eq('id', tId).maybeSingle()
          if (tr) {
            const trDelta = isCashOut ? -invoiceRow.paid_amount : invoiceRow.paid_amount
            await supabase.from('ax_treasuries').update({ balance: Number(tr.balance || 0) + trDelta }).eq('id', tr.id)
          }
        }
      }

      const rem = Number(invoiceRow.remaining_amount || 0)
      if (rem > 0 && invoiceRow.party_name) {
        const targetTable = (isSaleReturn || dbType === 'sale') ? 'ax_clients' : 'ax_suppliers'
        const { data: party } = await supabase.from(targetTable).select('*').eq('name', invoiceRow.party_name).maybeSingle()
        if (party) {
          const partyDelta = (isSaleReturn || isPurchaseReturn) ? -rem : rem
          await supabase.from(targetTable).update({ balance: Number(party.balance || 0) + partyDelta }).eq('id', party.id)
        } else {
          const initialBal = (isSaleReturn || isPurchaseReturn) ? -rem : rem
          await supabase.from(targetTable).insert({ id: generateUUID(), name: invoiceRow.party_name, phone: '', address: 'بيانات ناقصة', balance: initialBal })
        }
      }

      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_invoices', action: 'INSERT', record_id: invoiceId, new_data: invoiceRow, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteInvoiceInDB: async (inv, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function' || !inv) return { success: false }
    try {
      const invId = inv.id
      const isSaleReturn = inv.type === 'sale_return'
      const isPurchaseReturn = inv.type === 'purchase_return'
      const dbType = (isSaleReturn || inv.type === 'sale') ? 'sale' : 'purchase'
      const whId = inv.warehouseId || inv.warehouse_id

      if (inv.items && inv.items.length > 0 && whId) {
        for (const item of inv.items) {
          const itemId = item.itemId || item.id
          const qty = Number(item.quantity || 0)
          if (!itemId || qty <= 0) continue
          const { data: stockRow } = await supabase.from('ax_inventory_stock').select('*').eq('warehouse_id', whId).eq('item_id', itemId).maybeSingle()
          const reverseDelta = isSaleReturn ? -qty : (isPurchaseReturn ? qty : (dbType === 'sale' ? qty : -qty))
          if (stockRow) {
            const newQty = Number(stockRow.quantity || 0) + reverseDelta
            await supabase.from('ax_inventory_stock').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', stockRow.id)
          } else {
            await supabase.from('ax_inventory_stock').insert({ id: generateUUID(), warehouse_id: whId, item_id: itemId, quantity: reverseDelta, unit: item.unit || 'كرتونة' })
          }
        }
      }

      const paid = Number(inv.paidAmount ?? inv.paid_amount ?? 0)
      if (paid > 0) {
        let tId = inv.treasuryId || inv.treasury_id
        if (tId) {
          const { data: tr } = await supabase.from('ax_treasuries').select('*').eq('id', tId).maybeSingle()
          if (tr) {
            const isCashOut = (dbType === 'purchase' && !isPurchaseReturn) || isSaleReturn
            const reverseTrDelta = isCashOut ? paid : -paid
            await supabase.from('ax_treasuries').update({ balance: Number(tr.balance || 0) + reverseTrDelta }).eq('id', tr.id)
          }
        }
        if (inv.code) {
          await supabase.from('ax_cash_transactions').delete().ilike('notes', `%${inv.code}%`)
        }
      }

      const rem = Number(inv.remainingAmount ?? inv.remaining_amount ?? 0)
      const partyName = inv.partyName || inv.party_name
      if (rem > 0 && partyName) {
        const targetTable = (isSaleReturn || dbType === 'sale') ? 'ax_clients' : 'ax_suppliers'
        const { data: party } = await supabase.from(targetTable).select('*').eq('name', partyName).maybeSingle()
        if (party) {
          const reversePartyDelta = (isSaleReturn || isPurchaseReturn) ? rem : -rem
          await supabase.from(targetTable).update({ balance: Number(party.balance || 0) + reversePartyDelta }).eq('id', party.id)
        }
      }

      await AX_RecycleBinService.moveToRecycleBin({
        entityType: 'invoice',
        entityId: invId,
        entityCode: inv.code,
        entityTitle: `فاتورة ${inv.code || ''} - ${inv.partyName || inv.party_name || ''}`,
        originalData: inv,
        userProfile,
      })

      await supabase.from('ax_invoices').delete().eq('id', invId)
      try { await supabase.from('ax_activity_logs').insert({ id: generateUUID(), table_name: 'ax_invoices', action: 'DELETE', record_id: invId, new_data: { id: invId, code: inv.code }, user_id: userProfile?.id || null }) } catch {}
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateInvoiceInDB: async (oldInv, newInv, userProfile = null) => {
    if (!supabase || typeof supabase.from !== 'function') return { success: false }
    try {
      if (oldInv) {
        await AX_InvoiceOperationsService.deleteInvoiceInDB(oldInv, userProfile)
      }
      return await AX_InvoiceOperationsService.addInvoiceInDB(newInv, userProfile)
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
}

export default AX_InvoiceOperationsService
