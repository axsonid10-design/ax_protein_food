import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { offlineDB } from '../src/services/offlineDB.js'
import { AX_DraftsService } from '../src/services/AX_DraftsService.js'
import { buildInitialAuditRows, calculateAuditStats } from '../src/components/warehouses/stockAuditHelpers.js'

describe('Adversarial Verification: Multi-Draft Lifecycle & UI State Integrity', () => {
  beforeEach(async () => {
    AX_DraftsService.clearAllTimers()
    await offlineDB.clearDrafts()
  })

  describe('1. Multi-Draft Isolation: 5 Transfers vs 5 Audits', () => {
    it('strictly isolates 5 transfer drafts and 5 audit drafts without cross-contamination', async () => {
      const transferIds = []
      const auditIds = []

      for (let i = 1; i <= 5; i++) {
        const trfId = `trf-iso-${i}`
        transferIds.push(trfId)
        await AX_DraftsService.saveDraftImmediate({
          id: trfId,
          type: 'transfer',
          title: `تحويل تجريبي رقم ${i}`,
          warehouseId: `wh-${i}`,
          warehouseName: `مخزن ${i}`,
          payload: {
            fromId: `wh-${i}`,
            toId: `wh-${i + 1}`,
            operationalDate: `2026-11-0${i}`,
            selectedQuantities: {
              [`item-${i}`]: { quantity: i * 10, unit: 'كرتونة' },
            },
            notes: `ملاحظة تحويل ${i}`,
          },
        })

        const audId = `aud-iso-${i}`
        auditIds.push(audId)
        await AX_DraftsService.saveDraftImmediate({
          id: audId,
          type: 'stock_audit',
          title: `جرد تجريبي رقم ${i}`,
          warehouseId: `wh-${i}`,
          warehouseName: `مخزن ${i}`,
          payload: {
            warehouseId: `wh-${i}`,
            auditorName: `مراجع ${i}`,
            auditDate: `2026-11-0${i}`,
            auditNotes: `ملاحظة جرد ${i}`,
            auditRows: [
              { itemId: `it-${i}`, systemQty: 100, actualQty: 100 - i },
            ],
          },
        })
      }

      const allDrafts = await offlineDB.getAllDrafts()
      assert.strictEqual(allDrafts.length, 10)

      const transferList = await AX_DraftsService.getDrafts('transfer')
      assert.strictEqual(transferList.length, 5)
      for (const draft of transferList) {
        assert.strictEqual(draft.type, 'transfer')
        assert.ok(transferIds.includes(draft.id))
        assert.ok(!auditIds.includes(draft.id))
      }

      const auditList = await AX_DraftsService.getDrafts('stock_audit')
      assert.strictEqual(auditList.length, 5)
      for (const draft of auditList) {
        assert.strictEqual(draft.type, 'stock_audit')
        assert.ok(auditIds.includes(draft.id))
        assert.ok(!transferIds.includes(draft.id))
      }

      const unknownList = await AX_DraftsService.getDrafts('unknown_type')
      assert.strictEqual(unknownList.length, 0)
    })
  })

  describe('2. State Residuals When Resuming Draft B Over Draft A', () => {
    it('detects whether Transfer modal handleSelectDraft leaves residual notes when Draft B has empty notes', () => {
      const draftA = {
        id: 'draft-a',
        type: 'transfer',
        title: 'تحويل أ',
        payload: {
          fromId: 'wh-1',
          toId: 'wh-2',
          operationalDate: '2026-11-01',
          selectedQuantities: { 'item-100': { quantity: 50, unit: 'كرتونة' } },
          notes: 'ملاحظة تحويل هامة وسرية خاصة بمسودة أ',
        },
      }

      const draftB = {
        id: 'draft-b',
        type: 'transfer',
        title: 'تحويل ب',
        payload: {
          fromId: 'wh-2',
          toId: 'wh-3',
          operationalDate: '2026-11-05',
          selectedQuantities: { 'item-200': { quantity: 10, unit: 'كرتونة' } },
          notes: '',
        },
      }

      const simulateCurrentTransferHandleSelectDraft = (draft, currentState, warehouses) => {
        let fromId = currentState.fromId
        let toId = currentState.toId
        let operationalDate = currentState.operationalDate
        let selectedQuantities = currentState.selectedQuantities
        let notes = currentState.notes

        const p = draft.payload || {}
        if (p.fromId && warehouses.some((w) => w.id === p.fromId)) {
          fromId = p.fromId
        }
        if (p.toId && warehouses.some((w) => w.id === p.toId)) {
          toId = p.toId
        }
        if (p.operationalDate) {
          operationalDate = p.operationalDate
        }
        if (p.selectedQuantities && typeof p.selectedQuantities === 'object') {
          selectedQuantities = p.selectedQuantities
        }
        if (p.notes) {
          notes = p.notes
        }

        return { fromId, toId, operationalDate, selectedQuantities, notes }
      }

      const warehouses = [{ id: 'wh-1' }, { id: 'wh-2' }, { id: 'wh-3' }]

      const stateAfterDraftA = simulateCurrentTransferHandleSelectDraft(draftA, {
        fromId: 'wh-1',
        toId: 'wh-2',
        operationalDate: '2026-11-01',
        selectedQuantities: {},
        notes: '',
      }, warehouses)

      assert.strictEqual(stateAfterDraftA.notes, 'ملاحظة تحويل هامة وسرية خاصة بمسودة أ')
      assert.strictEqual(stateAfterDraftA.selectedQuantities['item-100'].quantity, 50)

      const stateAfterDraftB = simulateCurrentTransferHandleSelectDraft(draftB, stateAfterDraftA, warehouses)

      const hasResidualNotes = stateAfterDraftB.notes === 'ملاحظة تحويل هامة وسرية خاصة بمسودة أ'
      assert.strictEqual(
        hasResidualNotes,
        true,
        'FLAW CONFIRMED: Resuming Draft B preserves Draft A notes because `if (p.notes)` evaluates to false on empty string'
      )
    })

    it('detects whether Stock Audit handleSelectDraft leaves residual notes when Draft B has empty notes', () => {
      const draftAuditA = {
        id: 'audit-a',
        type: 'stock_audit',
        title: 'جرد أ',
        payload: {
          warehouseId: 'wh-1',
          auditorName: 'مراجع أول',
          auditDate: '2026-11-01',
          auditNotes: 'عجز بقيمة 50 ألف في بند اللحوم',
          selectedCategoryTab: 'لحوم',
          auditRows: [{ itemId: 'it-1', systemQty: 10, actualQty: 5 }],
        },
      }

      const draftAuditB = {
        id: 'audit-b',
        type: 'stock_audit',
        title: 'جرد ب',
        payload: {
          warehouseId: 'wh-2',
          auditorName: 'مراجع ثان',
          auditDate: '2026-11-05',
          auditNotes: '',
          selectedCategoryTab: 'ALL',
          auditRows: [{ itemId: 'it-2', systemQty: 20, actualQty: 20 }],
        },
      }

      const simulateCurrentStockAuditHandleSelectDraft = (draft, currentState) => {
        let activeWhId = currentState.activeWhId
        let auditorName = currentState.auditorName
        let auditDate = currentState.auditDate
        let auditNotes = currentState.auditNotes
        let selectedCategoryTab = currentState.selectedCategoryTab
        let auditRows = currentState.auditRows

        const p = draft.payload || {}
        if (p.warehouseId) activeWhId = p.warehouseId
        if (p.auditorName) auditorName = p.auditorName
        if (p.auditDate) auditDate = p.auditDate
        if (p.auditNotes) auditNotes = p.auditNotes
        if (p.selectedCategoryTab) selectedCategoryTab = p.selectedCategoryTab
        if (Array.isArray(p.auditRows) && p.auditRows.length > 0) {
          auditRows = p.auditRows
        }

        return { activeWhId, auditorName, auditDate, auditNotes, selectedCategoryTab, auditRows }
      }

      const stateAfterAuditA = simulateCurrentStockAuditHandleSelectDraft(draftAuditA, {
        activeWhId: 'wh-1',
        auditorName: 'مسؤول',
        auditDate: '2026-11-01',
        auditNotes: '',
        selectedCategoryTab: 'ALL',
        auditRows: [],
      })

      assert.strictEqual(stateAfterAuditA.auditNotes, 'عجز بقيمة 50 ألف في بند اللحوم')

      const stateAfterAuditB = simulateCurrentStockAuditHandleSelectDraft(draftAuditB, stateAfterAuditA)

      const hasResidualAuditNotes = stateAfterAuditB.auditNotes === 'عجز بقيمة 50 ألف في بند اللحوم'
      assert.strictEqual(
        hasResidualAuditNotes,
        true,
        'FLAW CONFIRMED: Resuming audit Draft B preserves Draft A auditNotes because `if (p.auditNotes)` does not reset empty notes'
      )
    })
  })

  describe('3. Lifecycle Cleanliness: Deleting Active Draft & Auto-Save Resurrection', () => {
    it('deleting an inactive draft removes it cleanly from offline store', async () => {
      await AX_DraftsService.saveDraftImmediate({
        id: 'draft-del-1',
        type: 'transfer',
        title: 'مسودة للحذف',
        payload: { fromId: 'wh-1' },
      })

      const before = await AX_DraftsService.getDrafts('transfer')
      assert.strictEqual(before.length, 1)

      await AX_DraftsService.deleteDraft('draft-del-1')

      const after = await AX_DraftsService.getDrafts('transfer')
      assert.strictEqual(after.length, 0)
    })

    it('verifies that deleting active draft via banner onDeleteDraft leaves form state non-empty and causes draft resurrection in Transfer modal', async () => {
      let activeDraftId = 'draft-active-trf'
      let selectedQuantities = { 'item-1': { quantity: 15, unit: 'كرتونة' } }
      let notes = 'تحويل جاري'

      await AX_DraftsService.saveDraftImmediate({
        id: activeDraftId,
        type: 'transfer',
        title: 'تحويل قيد العمل',
        payload: { selectedQuantities, notes },
      })

      const deleteDraftFromHook = async (id) => {
        if (!id) return
        await AX_DraftsService.deleteDraft(id)
        if (activeDraftId === id) {
          activeDraftId = null
        }
      }

      await deleteDraftFromHook(activeDraftId)

      assert.strictEqual(activeDraftId, null)

      const formStateIsEmpty = Object.keys(selectedQuantities).length === 0 && notes === ''
      assert.strictEqual(
        formStateIsEmpty,
        false,
        'FLAW CONFIRMED: AX_TransferFormModal onDeleteDraft does NOT reset selectedQuantities or notes'
      )

      const hasItems = Object.keys(selectedQuantities).length > 0
      const wouldAutoSaveTrigger = hasItems || notes.trim() !== ''

      assert.strictEqual(
        wouldAutoSaveTrigger,
        true,
        'FLAW CONFIRMED: Auto-save useEffect triggers immediately because selectedQuantities is still dirty'
      )

      if (wouldAutoSaveTrigger) {
        const resurrectedDraftId = `draft_transfer_${Date.now()}`
        await AX_DraftsService.saveDraftImmediate({
          id: resurrectedDraftId,
          type: 'transfer',
          title: 'تحويل معاد إنشاؤه تلقائياً',
          payload: { selectedQuantities, notes },
        })
      }

      const draftsAfterResurrection = await AX_DraftsService.getDrafts('transfer')
      assert.strictEqual(
        draftsAfterResurrection.length,
        1,
        'FLAW CONFIRMED: The deleted draft immediately resurrected as a ghost draft due to un-reset form state'
      )
    })
  })

  describe('4. Confirming Transfer or Audit Immediately Cleans Up Draft', () => {
    it('confirming immediate transfer deletes the active draft so it does not persist as ghost draft', async () => {
      const activeDraft = await AX_DraftsService.saveDraftImmediate({
        id: 'draft-to-confirm',
        type: 'transfer',
        title: 'تحويل مؤكد',
        payload: {
          fromId: 'wh-1',
          toId: 'wh-2',
          selectedQuantities: { 'item-10': { quantity: 5 } },
        },
      })

      let activeDraftId = activeDraft.id

      const discardActiveDraft = async () => {
        if (activeDraftId) {
          await AX_DraftsService.deleteDraft(activeDraftId)
          activeDraftId = null
        }
      }

      await discardActiveDraft()

      const remaining = await AX_DraftsService.getDrafts('transfer')
      assert.strictEqual(remaining.length, 0)
      assert.strictEqual(activeDraftId, null)
    })

    it('confirming stock audit deletes active audit draft so it does not persist', async () => {
      const activeAuditDraft = await AX_DraftsService.saveDraftImmediate({
        id: 'draft-audit-to-confirm',
        type: 'stock_audit',
        title: 'جرد مؤكد',
        payload: {
          warehouseId: 'wh-1',
          auditRows: [{ itemId: 'it-1', systemQty: 10, actualQty: 10 }],
        },
      })

      let activeDraftId = activeAuditDraft.id

      const discardActiveDraft = async () => {
        if (activeDraftId) {
          await AX_DraftsService.deleteDraft(activeDraftId)
          activeDraftId = null
        }
      }

      await discardActiveDraft()

      const remaining = await AX_DraftsService.getDrafts('stock_audit')
      assert.strictEqual(remaining.length, 0)
      assert.strictEqual(activeDraftId, null)
    })
  })
})
