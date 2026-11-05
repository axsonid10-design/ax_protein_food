import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { offlineDB } from './offlineDB.js'

export const AX_DatabaseSync = {
  fetchFullDatabase: async () => {
    if (!isSupabaseConfigured() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      try {
        const cached = localStorage.getItem('ax_cached_db_payload')
        if (cached) return JSON.parse(cached)
      } catch {}
      return null
    }

    try {
      const [
        { data: items },
        { data: warehouses },
        { data: stock },
        { data: audits },
        { data: transfers },
        { data: treasuries },
        { data: cashTx },
        { data: cashTransfers },
        { data: invoices },
        { data: clients },
        { data: suppliers },
        { data: distributors },
        { data: notifs },
        { data: categories },
        { data: mfgOrders },
        { data: usersProfiles },
        { data: staffInvites },
      ] = await Promise.all([
        supabase.from('ax_items').select('*'),
        supabase.from('ax_warehouses').select('*'),
        supabase.from('ax_inventory_stock').select('*'),
        supabase.from('ax_stock_audits').select('*').order('created_at', { ascending: false }),
        supabase.from('ax_transfers').select('*').order('requested_at', { ascending: false }),
        supabase.from('ax_treasuries').select('*'),
        supabase.from('ax_cash_transactions').select('*').order('date', { ascending: false }),
        supabase.from('ax_cash_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('ax_invoices').select('*').order('date', { ascending: false }),
        supabase.from('ax_clients').select('*'),
        supabase.from('ax_suppliers').select('*'),
        supabase.from('ax_distributors').select('*'),
        supabase.from('ax_notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('ax_categories').select('*'),
        supabase.from('ax_manufacturing_orders').select('*').order('date', { ascending: false }),
        supabase.from('ax_users_profiles').select('*'),
        supabase.from('ax_staff_invites').select('*').order('created_at', { ascending: false }),
      ])

      const payload = {}

      if (Array.isArray(items)) {
        payload.items = items.map((it) => ({
          id: it.id,
          code: it.code,
          compositeName: it.composite_name,
          primaryCategory: it.primary_category,
          subCategory: it.sub_category,
          secondaryCategory: it.secondary_category,
          unitType: it.unit_type,
          units: [it.unit_type, Number(it.pieces_per_carton) > 0 ? 'قطعة' : null, 'كيلو'].filter(Boolean),
          weightPerCarton: Number(it.weight_per_carton || 0),
          piecesPerCarton: it.pieces_per_carton ? Number(it.pieces_per_carton) : null,
          grainsPerPiece: it.grains_per_piece ? Number(it.grains_per_piece) : null,
          pieceWeight: it.piece_weight,
          grainWeight: it.grain_weight,
          buyPrice: Number(it.buy_price || 0),
          sellPrice: Number(it.sell_price || 0),
          pieceBuyPrice: it.piece_buy_price ? Number(it.piece_buy_price) : null,
          pieceSellPrice: it.piece_sell_price ? Number(it.piece_sell_price) : null,
          grainBuyPrice: it.grain_buy_price ? Number(it.grain_buy_price) : null,
          grainSellPrice: it.grain_sell_price ? Number(it.grain_sell_price) : null,
          imageUrl: it.image_url,
        }))
      }

      if (Array.isArray(warehouses)) {
        payload.warehouses = warehouses.map((wh) => ({
          id: wh.id,
          name: wh.name,
          type: wh.type,
          manager: wh.manager || '',
          phone: wh.phone || '',
        }))
      }

      if (Array.isArray(stock)) {
        payload.inventoryStock = stock.map((s) => ({
          warehouseId: s.warehouse_id,
          itemId: s.item_id,
          quantity: Number(s.quantity || 0),
          unit: s.unit || 'كرتونة',
        }))
      }

      if (Array.isArray(audits)) {
        payload.stockAudits = audits.map((a) => ({
          id: a.id,
          code: a.code,
          warehouseId: a.warehouse_id,
          warehouseName: a.warehouse_name,
          auditorName: a.auditor_name,
          date: a.audit_date,
          operationalDate: a.audit_date,
          createdAt: a.created_at || a.audit_date,
          created_at: a.created_at,
          itemsCount: Number(a.items_count || 0),
          deficitsCount: Number(a.deficits_count || 0),
          surplusesCount: Number(a.surpluses_count || 0),
          totalVarianceCost: Number(a.total_variance_cost || 0),
          notes: a.notes,
          status: a.status,
          items: a.items || [],
        }))
      }

      if (Array.isArray(transfers)) {
        payload.transfers = transfers.map((t) => ({
          id: t.id,
          code: t.code,
          fromId: t.from_warehouse_id,
          toId: t.to_warehouse_id,
          status: t.status,
          date: t.date || (t.requested_at ? String(t.requested_at).split('T')[0] : null),
          operationalDate: t.operational_date || t.date || (t.requested_at ? String(t.requested_at).split('T')[0] : null),
          requestedAt: t.requested_at,
          createdAt: t.created_at || t.requested_at,
          created_at: t.created_at,
          confirmedAt: t.confirmed_at,
          isAuditDiscrepancy: Boolean(t.is_audit_discrepancy || t.isAuditDiscrepancy),
          auditDiscrepancyNote: t.audit_discrepancy_note || t.auditDiscrepancyNote || '',
          notes: t.notes,
          items: t.items || (t.item_id ? [{ itemId: t.item_id, quantity: Number(t.quantity || 0), unit: t.unit }] : []),
        }))
      }

      if (Array.isArray(treasuries)) {
        payload.treasuryAccounts = treasuries.map((tr) => ({
          id: tr.id,
          name: tr.name,
          type: tr.type,
          balance: Number(tr.balance || 0),
        }))
      }

      if (Array.isArray(cashTx)) {
        payload.cashTransactions = cashTx.map((c) => {
          let resolvedType = c.type
          if (c.type === 'expense' && (c.party_type === 'employee' || c.notes?.includes('[أجور') || c.code?.startsWith('WAGE-'))) {
            resolvedType = 'payroll'
          }
          return {
            id: c.id,
            code: c.code,
            type: resolvedType,
            partyType: c.party_type,
            partyName: c.party_name,
            amount: Number(c.amount || 0),
            treasuryId: c.treasury_id,
            date: c.date,
            operationalDate: c.date,
            createdAt: c.created_at || c.date,
            created_at: c.created_at,
            notes: c.notes,
          }
        })
      }

      if (Array.isArray(cashTransfers)) {
        const mappedTransfers = cashTransfers.map((ct) => ({
          id: ct.id,
          code: ct.code,
          fromTreasuryId: ct.from_treasury_id,
          toTreasuryId: ct.to_treasury_id,
          amount: Number(ct.amount || 0),
          status: ct.status,
          senderName: ct.sender_name || 'أمين الخزينة',
          date: ct.date,
          notes: ct.notes,
          confirmedAt: ct.confirmed_at,
          createdAt: ct.created_at,
        }))
        payload.pendingCashTransfers = mappedTransfers
        payload.cashTransfers = mappedTransfers
      }

      if (Array.isArray(invoices)) {
        payload.invoices = invoices.map((inv) => {
          let resolvedType = inv.type
          if (inv.payment_terms === 'مردود مبيعات' || inv.code?.startsWith('RET-SALE') || inv.status === 'sale_return') {
            resolvedType = 'sale_return'
          } else if (inv.payment_terms === 'مردود مشتريات' || inv.code?.startsWith('RET-PURCHASE') || inv.status === 'purchase_return') {
            resolvedType = 'purchase_return'
          }
          return {
            id: inv.id,
            code: inv.code,
            type: resolvedType,
            partyName: inv.party_name,
            warehouseId: inv.warehouse_id,
            date: inv.date,
            operationalDate: inv.date,
            createdAt: inv.created_at || inv.date,
            created_at: inv.created_at,
            transportCost: Number(inv.transport_cost || 0),
            loadingCost: Number(inv.loading_cost || 0),
            subtotal: Number(inv.subtotal || 0),
            total: Number(inv.total || 0),
            paidAmount: Number(inv.paid_amount || 0),
            remainingAmount: Number(inv.remaining_amount || 0),
            status: inv.status || 'paid',
            paymentTerms: inv.payment_terms || (Number(inv.remaining_amount) > 0 ? 'مدفوع جزئي' : 'مدفوع كلي'),
            items: inv.items || [],
          }
        })
      }

      if (Array.isArray(clients)) {
        payload.clients = clients.map((c) => ({
          ...c,
          salesRepName: c.sales_rep_name || c.salesRepName || '',
          commercialRegister: c.commercial_register || c.commercialRegister || '',
          contactPerson: c.contact_person || c.contactPerson || '',
          phone2: c.phone2 || '',
          governorate: c.governorate || '',
          city: c.city || '',
          district: c.district || '',
          primaryCategory: c.primary_category || c.primaryCategory || 'عام',
          notes: c.notes || '',
          attachments: c.attachments || [],
        }))
      }

      if (Array.isArray(suppliers)) {
        payload.suppliers = suppliers
      }

      if (Array.isArray(distributors)) {
        payload.distributors = distributors.map((d) => ({
          id: d.id,
          name: d.name,
          vanNumber: d.van_number,
        }))
        payload.salesReps = distributors.map((d) => ({
          id: d.id,
          name: d.name || '',
          phone: d.phone || '',
          assignedBranch: d.van_number || 'المخزن الرئيسي',
          vanNumber: d.van_number || '',
          targetAmount: Number(d.target_amount ?? d.sales_target ?? 0),
          salesTarget: Number(d.target_amount ?? d.sales_target ?? 0),
          commissionModel: d.commission_model || 'volume_rate',
          stepAmount: Number(d.step_amount || 1000),
          stepRate: Number(d.step_rate || 50),
          openingBalance: Number(d.opening_balance || 0),
          netBalance: Number(d.balance || 0),
          currentBalance: Number(d.balance || 0),
          balance: Number(d.balance || 0),
          status: d.status || 'active',
          createdAt: d.created_at || new Date().toISOString(),
        }))
      }

      if (Array.isArray(notifs)) {
        payload.notifications = notifs.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          targetTab: n.target_tab,
          read: n.read,
          time: 'الآن',
        }))
      }

      if (Array.isArray(categories) && categories.length > 0) {
        const primaries = categories.filter((c) => c.level === 'primary')
        const subs = categories.filter((c) => c.level === 'sub')
        const secondaries = categories.filter((c) => c.level === 'secondary')

        payload.categories = primaries.map((c) => c.name)

        const subMap = {}
        primaries.forEach((p) => {
          subMap[p.name] = subs.filter((s) => s.parent_id === p.id).map((s) => s.name)
        })
        payload.subCategories = subMap

        payload.secondaryCategories = secondaries.map((c) => c.name)
      }

      if (Array.isArray(mfgOrders)) {
        payload.manufacturingOrders = mfgOrders.map((o) => ({
          id: o.id,
          code: o.code,
          date: o.date,
          rawItemId: o.raw_item_id,
          rawWarehouseId: o.raw_warehouse_id,
          consumedQuantity: Number(o.consumed_quantity || 0),
          consumedUnit: o.consumed_unit || 'كرتونة',
          producedItems: o.produced_items || [],
          wastePercentage: Number(o.waste_percentage || 0),
          status: o.status || 'completed',
          operator: o.operator || '',
          notes: o.notes || '',
          createdAt: o.created_at,
        }))
      }

      if (Array.isArray(staffInvites)) {
        payload.staffInvites = staffInvites.map((inv) => ({
          id: inv.id,
          token: inv.token,
          role: inv.role,
          roleTitle: inv.role_title || inv.role,
          role_title: inv.role_title || inv.role,
          warehouseId: inv.warehouse_id,
          warehouse_id: inv.warehouse_id,
          warehouseName: inv.warehouse_name || 'كافة الفروع والمخازن',
          warehouse_name: inv.warehouse_name || 'كافة الفروع والمخازن',
          permissions: inv.permissions,
          status: inv.status,
          expiresAt: inv.expires_at,
          expires_at: inv.expires_at,
          createdAt: inv.created_at,
          created_at: inv.created_at,
          claimedAt: inv.claimed_at,
          claimedByEmail: inv.claimed_by_email,
          claimedByName: inv.claimed_by_name,
        }))
        try {
          localStorage.setItem('ax_staff_invites', JSON.stringify(payload.staffInvites))
        } catch {}
      }

      if (Array.isArray(usersProfiles)) {
        payload.employees = usersProfiles.map((u) => ({
          id: u.id,
          code: `EMP-${String(u.id).slice(-4)}`,
          name: u.full_name,
          role: u.role === 'super_admin' ? 'admin' : 'staff',
          roleTitle: u.role || 'موظف',
          phone: u.phone || '',
          email: u.email,
          warehouseId: u.branch_id || 'all',
          warehouseName: u.branch_id ? 'مخزن' : 'كافة الفروع والمخازن',
          status: u.is_active ? 'active' : 'suspended',
          permissions: u.permissions || {},
        }))
        try {
          localStorage.setItem('ax_staff_employees', JSON.stringify(payload.employees))
        } catch {}
      }

      try {
        localStorage.setItem('ax_cached_db_payload', JSON.stringify(payload))
        offlineDB.cacheData('full_database', payload).catch(() => {})
      } catch {}

      return payload
    } catch {
      try {
        const cached = localStorage.getItem('ax_cached_db_payload')
        if (cached) return JSON.parse(cached)
      } catch {}
      return null
    }
  },
}
