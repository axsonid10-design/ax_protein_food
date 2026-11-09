import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getDeviceFingerprint } from '../src/services/AX_PushNotificationService.js'

describe('Web Push: Device Fingerprint & Localhost-Production Deduplication', () => {
  it('generates consistent deterministic device fingerprint for current environment', () => {
    const fp1 = getDeviceFingerprint()
    const fp2 = getDeviceFingerprint()

    assert.ok(typeof fp1 === 'string' && fp1.length > 0)
    assert.strictEqual(fp1, fp2)
  })

  it('deduplicates multiple subscriptions from the same device and prefers production over localhost', () => {
    const candidateSubs = [
      {
        id: 'sub-local-1',
        user_id: 'usr_master_axonid',
        endpoint: 'https://wns2.notify.windows.com/w/?token=local',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/157',
        device_fingerprint: 'fp_windows_pc',
        origin: 'http://localhost:8182',
        is_local: true,
        updated_at: '2026-11-09T00:00:00Z',
      },
      {
        id: 'sub-prod-1',
        user_id: 'usr_master_axonid',
        endpoint: 'https://wns2.notify.windows.com/w/?token=prod',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/157',
        device_fingerprint: 'fp_windows_pc',
        origin: 'https://protein-food.axsonid.com',
        is_local: false,
        updated_at: '2026-11-08T22:00:00Z',
      },
      {
        id: 'sub-android-1',
        user_id: 'usr_master_axonid',
        endpoint: 'https://fcm.googleapis.com/fcm/send/android',
        user_agent: 'Mozilla/5.0 (Linux; Android 10; K) Mobile Safari',
        device_fingerprint: 'fp_android_phone',
        origin: 'https://protein-food.axsonid.com',
        is_local: false,
        updated_at: '2026-11-09T01:00:00Z',
      },
    ]

    const deviceMap = new Map()
    for (const sub of candidateSubs) {
      const deviceKey = `${sub.user_id}_${sub.device_fingerprint}`
      const isSubLocal = Boolean(sub.is_local) || (sub.origin && sub.origin.includes('localhost'))

      if (!deviceMap.has(deviceKey)) {
        deviceMap.set(deviceKey, sub)
      } else {
        const existing = deviceMap.get(deviceKey)
        const isExistingLocal = Boolean(existing.is_local) || (existing.origin && existing.origin.includes('localhost'))

        if (isExistingLocal && !isSubLocal) {
          deviceMap.set(deviceKey, sub)
        } else if (!isExistingLocal && isSubLocal) {
        } else {
          const timeSub = new Date(sub.updated_at).getTime()
          const timeExisting = new Date(existing.updated_at).getTime()
          if (timeSub > timeExisting) {
            deviceMap.set(deviceKey, sub)
          }
        }
      }
    }

    const uniqueSubs = Array.from(deviceMap.values())

    assert.strictEqual(uniqueSubs.length, 2, 'Must yield exactly 2 unique physical devices')
    const winSub = uniqueSubs.find((s) => s.device_fingerprint === 'fp_windows_pc')
    const phoneSub = uniqueSubs.find((s) => s.device_fingerprint === 'fp_android_phone')

    assert.ok(winSub, 'Windows PC must be present')
    assert.strictEqual(winSub.id, 'sub-prod-1', 'Production subscription must trump localhost subscription')
    assert.ok(phoneSub, 'Android phone must be present')
  })
})
