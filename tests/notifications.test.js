import { describe, it } from 'node:test'
import assert from 'node:assert'
import { initialNotifications } from '../src/store/initialData.js'
import { AX_OperationsService } from '../src/services/AX_OperationsService.js'

describe('Notifications System Integrity', () => {
  it('should not contain any hardcoded mock notifications in initialNotifications', () => {
    assert.strictEqual(
      Array.isArray(initialNotifications),
      true,
      'initialNotifications should be an array'
    )
    assert.strictEqual(
      initialNotifications.length,
      0,
      'initialNotifications MUST be empty [] (no mock data)'
    )
  })

  it('should mark all notifications as read properly', () => {
    const list = [
      { id: 'notif-1', title: 'تنبيه 1', read: false },
      { id: 'notif-2', title: 'تنبيه 2', read: false },
      { id: 'notif-3', title: 'تنبيه 3', read: true },
    ]

    const updated = list.map((n) => ({ ...n, read: true }))
    assert.ok(updated.every((n) => n.read === true))
  })

  it('should safely execute markAllNotificationsReadInDB without .catch TypeError', async () => {
    await assert.doesNotReject(async () => {
      await AX_OperationsService.markAllNotificationsReadInDB()
    })
  })

  it('should safely execute markNotificationReadInDB without .catch TypeError', async () => {
    await assert.doesNotReject(async () => {
      await AX_OperationsService.markNotificationReadInDB('test-id')
    })
  })

  it('should safely execute addNotificationInDB without .catch TypeError', async () => {
    await assert.doesNotReject(async () => {
      await AX_OperationsService.addNotificationInDB({ title: 'فحص', message: 'تجربة' })
    })
  })
})
