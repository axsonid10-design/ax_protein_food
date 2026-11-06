import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { offlineDB } from '../src/services/offlineDB.js'
import { AX_DraftsService } from '../src/services/AX_DraftsService.js'

describe('R3: Persistent Drafts System for Transfers & Stock Audits', () => {
  beforeEach(async () => {
    AX_DraftsService.clearAllTimers()
    await offlineDB.clearDrafts()
  })

  describe('1. Storage & Local Persistence (offlineDB)', () => {
    it('should save and retrieve a transfer draft in offline store', async () => {
      const draft = {
        id: 'trf-draft-1',
        type: 'transfer',
        title: 'تحويل: من الرئيسي إلى الدكان',
        warehouseId: 'wh-1',
        warehouseName: 'المخزن الرئيسي',
        payload: {
          fromId: 'wh-1',
          toId: 'wh-2',
          operationalDate: '2026-11-06',
          selectedQuantities: { 'item-101': { quantity: 5, unit: 'كرتونة' } },
          notes: 'إذن تحويل مسائي',
        },
      }

      const saved = await offlineDB.saveDraft(draft)
      assert.strictEqual(saved.id, 'trf-draft-1')
      assert.ok(saved.updatedAt)

      const retrieved = await offlineDB.getDraft('trf-draft-1')
      assert.ok(retrieved)
      assert.strictEqual(retrieved.id, 'trf-draft-1')
      assert.strictEqual(retrieved.payload.fromId, 'wh-1')
      assert.strictEqual(retrieved.payload.selectedQuantities['item-101'].quantity, 5)
    })

    it('should save and retrieve a stock audit draft in offline store', async () => {
      const draft = {
        id: 'audit-draft-1',
        type: 'stock_audit',
        title: 'جرد: المخزن الرئيسي',
        warehouseId: 'wh-1',
        warehouseName: 'المخزن الرئيسي',
        payload: {
          warehouseId: 'wh-1',
          auditorName: 'أحمد محمود',
          auditDate: '2026-11-06',
          auditNotes: 'جرد دوري',
          auditRows: [
            { itemId: 'it-1', itemName: 'لحمة مفرومة', systemQty: 20, actualQty: 18, costPrice: 150 },
            { itemId: 'it-2', itemName: 'برجر بقري', systemQty: 10, actualQty: 10, costPrice: 90 },
          ],
        },
      }

      await offlineDB.saveDraft(draft)
      const retrieved = await offlineDB.getDraft('audit-draft-1')
      assert.ok(retrieved)
      assert.strictEqual(retrieved.type, 'stock_audit')
      assert.strictEqual(retrieved.payload.auditRows.length, 2)
      assert.strictEqual(retrieved.payload.auditRows[0].actualQty, 18)
    })

    it('should delete a draft cleanly without affecting others', async () => {
      await offlineDB.saveDraft({ id: 'd-1', type: 'transfer', title: 'مسودة 1' })
      await offlineDB.saveDraft({ id: 'd-2', type: 'transfer', title: 'مسودة 2' })

      const before = await offlineDB.getAllDrafts()
      assert.strictEqual(before.length, 2)

      const deleted = await offlineDB.deleteDraft('d-1')
      assert.strictEqual(deleted, true)

      const after = await offlineDB.getAllDrafts()
      assert.strictEqual(after.length, 1)
      assert.strictEqual(after[0].id, 'd-2')

      const checkDeleted = await offlineDB.getDraft('d-1')
      assert.strictEqual(checkDeleted, null)
    })
  })

  describe('2. Multi-Draft Management & Type Segregation (AX_DraftsService)', () => {
    it('should segregate transfer drafts from stock audit drafts', async () => {
      await AX_DraftsService.saveDraftImmediate({
        id: 'trf-1',
        type: 'transfer',
        title: 'تحويل 1',
        payload: { fromId: 'wh-1' },
      })
      await AX_DraftsService.saveDraftImmediate({
        id: 'trf-2',
        type: 'transfer',
        title: 'تحويل 2',
        payload: { fromId: 'wh-2' },
      })
      await AX_DraftsService.saveDraftImmediate({
        id: 'aud-1',
        type: 'stock_audit',
        title: 'جرد 1',
        payload: { warehouseId: 'wh-1' },
      })

      const transferDrafts = await AX_DraftsService.getDrafts('transfer')
      const auditDrafts = await AX_DraftsService.getDrafts('stock_audit')

      assert.strictEqual(transferDrafts.length, 2)
      assert.ok(transferDrafts.every((d) => d.type === 'transfer'))

      assert.strictEqual(auditDrafts.length, 1)
      assert.strictEqual(auditDrafts[0].id, 'aud-1')
      assert.strictEqual(auditDrafts[0].type, 'stock_audit')
    })

    it('should sort drafts by updatedAt descending', async () => {
      await AX_DraftsService.saveDraftImmediate({
        id: 'old-draft',
        type: 'transfer',
        title: 'قديمة',
        updatedAt: '2026-11-06T10:00:00Z',
      })
      await AX_DraftsService.saveDraftImmediate({
        id: 'new-draft',
        type: 'transfer',
        title: 'حديثة',
        updatedAt: '2026-11-06T12:00:00Z',
      })

      const list = await AX_DraftsService.getDrafts('transfer')
      assert.strictEqual(list[0].id, 'new-draft')
      assert.strictEqual(list[1].id, 'old-draft')
    })

    it('should support multi-draft lifecycle: create, resume, edit, and delete', async () => {
      const draftA = await AX_DraftsService.saveDraftImmediate({
        id: 'multi-a',
        type: 'transfer',
        title: 'تحويل الفرع أ',
        payload: { fromId: 'wh-1', toId: 'wh-2', selectedQuantities: { it1: { quantity: 10 } } },
      })
      const draftB = await AX_DraftsService.saveDraftImmediate({
        id: 'multi-b',
        type: 'transfer',
        title: 'تحويل الفرع ب',
        payload: { fromId: 'wh-1', toId: 'wh-3', selectedQuantities: { it2: { quantity: 25 } } },
      })

      assert.strictEqual(draftA.id, 'multi-a')
      assert.strictEqual(draftB.id, 'multi-b')

      const loadedA = await AX_DraftsService.getDraftById('multi-a')
      assert.strictEqual(loadedA.payload.selectedQuantities.it1.quantity, 10)

      await AX_DraftsService.saveDraftImmediate({
        ...loadedA,
        title: 'تحويل الفرع أ - معدل',
        payload: {
          ...loadedA.payload,
          selectedQuantities: { it1: { quantity: 15 } },
        },
      })

      const updatedA = await AX_DraftsService.getDraftById('multi-a')
      assert.strictEqual(updatedA.title, 'تحويل الفرع أ - معدل')
      assert.strictEqual(updatedA.payload.selectedQuantities.it1.quantity, 15)

      await AX_DraftsService.deleteDraft('multi-a')
      const deletedCheck = await AX_DraftsService.getDraftById('multi-a')
      assert.strictEqual(deletedCheck, null)

      const remainingB = await AX_DraftsService.getDraftById('multi-b')
      assert.ok(remainingB)
      assert.strictEqual(remainingB.payload.selectedQuantities.it2.quantity, 25)
    })
  })

  describe('3. Debounced Auto-Save & Timers', () => {
    it('should write immediately to local store during debounced calls', async () => {
      const p = AX_DraftsService.saveDraftDebounced({
        id: 'debounced-1',
        type: 'stock_audit',
        title: 'جرد سريع',
        payload: { count: 1 },
      }, 50)

      await p
      const immediateLocal = await offlineDB.getDraft('debounced-1')
      assert.ok(immediateLocal)
      assert.strictEqual(immediateLocal.payload.count, 1)
    })

    it('should collapse rapid consecutive saves to latest state', async () => {
      AX_DraftsService.saveDraftDebounced({
        id: 'debounced-stream',
        type: 'transfer',
        title: 'تحويل لحظي 1',
        payload: { step: 1 },
      }, 60)

      AX_DraftsService.saveDraftDebounced({
        id: 'debounced-stream',
        type: 'transfer',
        title: 'تحويل لحظي 2',
        payload: { step: 2 },
      }, 60)

      const finalPromise = AX_DraftsService.saveDraftDebounced({
        id: 'debounced-stream',
        type: 'transfer',
        title: 'تحويل لحظي نهائي',
        payload: { step: 3 },
      }, 60)

      await finalPromise
      const finalLocal = await offlineDB.getDraft('debounced-stream')
      assert.strictEqual(finalLocal.title, 'تحويل لحظي نهائي')
      assert.strictEqual(finalLocal.payload.step, 3)

      await new Promise((resolve) => setTimeout(resolve, 80))
      const afterDebounce = await AX_DraftsService.getDraftById('debounced-stream')
      assert.strictEqual(afterDebounce.payload.step, 3)
    })
  })

  describe('4. Restoration Fidelity & Payloads', () => {
    it('should preserve complete transfer payload structure faithfully', async () => {
      const complexTransfer = {
        id: 'fidelity-trf',
        type: 'transfer',
        title: 'تحويل أصناف مجمدة متعددة',
        warehouseId: 'wh-cold',
        warehouseName: 'تجميد اللحوم الرئيسي',
        payload: {
          fromId: 'wh-cold',
          toId: 'wh-dokkan',
          operationalDate: '2026-11-06',
          selectedQuantities: {
            'item-sadr': { quantity: 12, unit: 'كرتونة', itemName: 'لحمة صدر الحمد' },
            'item-senn': { quantity: 8, unit: 'كرتونة', itemName: 'لحمة سن الحمد' },
          },
          notes: 'تحويل عاجل لسد طلبات المطاعم',
        },
      }

      await AX_DraftsService.saveDraftImmediate(complexTransfer)
      const restored = await AX_DraftsService.getDraftById('fidelity-trf')

      assert.deepStrictEqual(restored.payload.fromId, 'wh-cold')
      assert.deepStrictEqual(restored.payload.toId, 'wh-dokkan')
      assert.strictEqual(restored.payload.selectedQuantities['item-sadr'].quantity, 12)
      assert.strictEqual(restored.payload.selectedQuantities['item-senn'].unit, 'كرتونة')
      assert.strictEqual(restored.payload.notes, 'تحويل عاجل لسد طلبات المطاعم')
    })

    it('should preserve complete stock audit rows and metrics faithfully', async () => {
      const complexAudit = {
        id: 'fidelity-audit',
        type: 'stock_audit',
        title: 'جرد الدكان الشامل',
        warehouseId: 'wh-dokkan',
        warehouseName: 'مخزن الدكان',
        payload: {
          warehouseId: 'wh-dokkan',
          warehouseName: 'مخزن الدكان',
          auditorName: 'محمود عبد الفتاح',
          auditDate: '2026-11-06',
          auditNotes: 'تم حصر اللحوم المصنعة وعجز طفيف باللحم البقري',
          selectedCategoryTab: 'مصنعات',
          auditRows: [
            {
              itemId: 'it-burger',
              itemName: 'برجر جامبو',
              category: 'مصنعات',
              unit: 'كرتونة',
              costPrice: 120,
              systemQty: 30,
              actualQty: 28,
            },
            {
              itemId: 'it-kofta',
              itemName: 'كفتة مشوية',
              category: 'مصنعات',
              unit: 'كرتونة',
              costPrice: 95,
              systemQty: 15,
              actualQty: 17,
            },
          ],
        },
      }

      await AX_DraftsService.saveDraftImmediate(complexAudit)
      const restored = await AX_DraftsService.getDraftById('fidelity-audit')

      assert.strictEqual(restored.payload.auditorName, 'محمود عبد الفتاح')
      assert.strictEqual(restored.payload.auditRows.length, 2)
      assert.strictEqual(restored.payload.auditRows[0].actualQty, 28)
      assert.strictEqual(restored.payload.auditRows[1].actualQty, 17)
    })
  })

  describe('5. Architectural Invariants & File Discipline', () => {
    const requiredFiles = [
      'src/services/AX_DraftsService.js',
      'src/hooks/useDrafts.js',
      'src/components/common/AX_DraftsManagerBanner.jsx',
      'src/components/warehouses/AX_StockAuditStatsBar.jsx',
      'src/components/warehouses/stockAuditHelpers.js',
      'src/components/warehouses/AX_StockAuditModal.jsx',
      'src/components/warehouses/AX_TransferFormModal.jsx',
    ]

    requiredFiles.forEach((relPath) => {
      it(`should strictly NOT exceed 500 lines: ${relPath}`, () => {
        const fullPath = path.resolve(process.cwd(), relPath)
        assert.ok(fs.existsSync(fullPath), `File does not exist: ${relPath}`)
        const content = fs.readFileSync(fullPath, 'utf-8')
        const lineCount = content.split('\n').length
        assert.ok(
          lineCount <= 500,
          `File ${relPath} exceeds 500 lines! Actual lines: ${lineCount}`
        )
      })

      it(`should contain zero comments in code: ${relPath}`, () => {
        const fullPath = path.resolve(process.cwd(), relPath)
        const content = fs.readFileSync(fullPath, 'utf-8')
        const lines = content.split('\n')
        lines.forEach((line, idx) => {
          const trimmed = line.trim()
          const isSlashComment = trimmed.startsWith('//')
          const isBlockComment = trimmed.startsWith('/*') || trimmed.startsWith('*')
          assert.ok(
            !isSlashComment && !isBlockComment,
            `Line ${idx + 1} in ${relPath} contains prohibited comment: "${trimmed}"`
          )
        })
      })
    })
  })
})
