import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Smartphone, CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react';
import { AX_PushNotificationService } from '../../services/AX_PushNotificationService';
import { axToast as toast } from '../common/AX_Toast';

export const AX_PushNotificationCard = ({ profile, isRtl = true }) => {
  const [status, setStatus] = useState('checking');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkPushStatus();
  }, [profile?.id]);

  const checkPushStatus = async () => {
    if (!AX_PushNotificationService.isSupported()) {
      setStatus('unsupported');
      return;
    }

    const perm = AX_PushNotificationService.getPermissionState();
    setStatus(perm);

    if (perm === 'granted' && profile?.id) {
      const sub = await AX_PushNotificationService.getActiveSubscription();
      if (sub) {
        setIsSubscribed(true);
      } else {
        const res = await AX_PushNotificationService.subscribeUser(profile.id);
        setIsSubscribed(Boolean(res.success));
      }
    } else {
      setIsSubscribed(false);
    }
  };

  const handleEnablePush = async () => {
    if (!profile?.id) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isRtl ? 'جاري تفعيل إشعارات الهاتف...' : 'Activating push notifications...');
    try {
      const res = await AX_PushNotificationService.subscribeUser(profile.id);
      if (res.success) {
        setIsSubscribed(true);
        setStatus('granted');
        toast.success(
          isRtl 
            ? 'تم تفعيل إشعارات الهاتف بنجاح! ستصلك التنبيهات حتى عند إغلاق التطبيق وقفل الشاشة.' 
            : 'Push notifications activated! You will receive alerts even when the app is closed.',
          { id: toastId }
        );
        try {
          await AX_PushNotificationService.sendTestPush(profile.id);
        } catch {}
      } else if (res.reason === 'permission_denied') {
        setStatus('denied');
        toast.error(
          isRtl
            ? 'تم رفض إذن الإشعارات من المتصفح. يرجى السماح بالإشعارات من إعدادات الموقع بالمتصفح.'
            : 'Notification permission denied in browser settings.',
          { id: toastId }
        );
      } else {
        toast.error(isRtl ? 'فشل تفعيل الإشعارات' : 'Failed to activate notifications', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'حدث خطأ أثناء تفعيل الإشعارات' : 'Error activating push', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    if (!profile?.id) return;
    setTesting(true);
    const toastId = toast.loading(isRtl ? 'جاري إرسال إشعار تجريبي لهاتفك...' : 'Sending test notification...');
    try {
      await AX_PushNotificationService.sendTestPush(profile.id);
      toast.success(
        isRtl 
          ? 'تم إرسال الإشعار بنجاح! تحقق الآن من شاشة هاتفك أو شريط الإشعارات.' 
          : 'Notification sent! Check your device lockscreen or notification tray.',
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل إرسال الإشعار التجريبي' : 'Failed to send test push', { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const handleDisablePush = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      await AX_PushNotificationService.unsubscribeUser(profile.id);
      setIsSubscribed(false);
      toast.success(isRtl ? 'تم إلغاء تفعيل الإشعارات على هذا الجهاز' : 'Notifications disabled on this device');
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل إلغاء التفعيل' : 'Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'unsupported') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
        <p>
          {isRtl 
            ? 'المتصفح الحالي لا يدعم Web Push. لضمان وصول الإشعارات عند إغلاق التطبيق، افتح النظام من متصفح Chrome أو Edge أو قم بتثبيت التطبيق (PWA).' 
            : 'Current browser does not support Web Push. Please use Chrome/Edge or install the PWA app.'}
        </p>
      </div>
    );
  }

  const isWorking = status === 'granted' && isSubscribed;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isWorking 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            {isWorking ? <BellRing className="w-6 h-6 animate-pulse" /> : <Smartphone className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {isRtl ? 'إشعارات الهاتف الميدانية (Push Notifications)' : 'Device Push Notifications'}
              </h3>
              {isWorking ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  {isRtl ? 'مفعّلة على هذا الجهاز' : 'Active on this device'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300">
                  <AlertCircle className="w-3 h-3" />
                  {isRtl ? 'غير مفعلة' : 'Inactive'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 leading-relaxed">
              {isWorking
                ? (isRtl 
                    ? 'الجهاز متصل بنجاح! ستصلك التنبيهات وتضيء شاشة هاتفك فوراً بصوت واهتزاز حتى والتطبيق مغلق تماماً.' 
                    : 'Device connected! Alerts will arrive and light up your screen with sound even when the app is closed.')
                : (isRtl
                    ? 'اضغط على تفعيل لتصلك تنبيهات المهام والمشاريع والدفعات المالية على شاشة قفل هاتفك مباشرة دون الحاجة لفتح التطبيق.'
                    : 'Click enable to receive tasks, projects, and payment alerts directly on your lockscreen without opening the app.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isWorking ? (
            <>
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all hover:-translate-y-0.5 shadow-sm disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isRtl ? 'اختبار الإشعار على الهاتف الآن' : 'Send Test Notification'}</span>
              </button>

              <button
                type="button"
                onClick={handleDisablePush}
                disabled={loading}
                className="px-3 py-2 rounded-full text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
              >
                {isRtl ? 'إلغاء التفعيل' : 'Disable'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all hover:-translate-y-0.5 shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              <span>{isRtl ? 'تفعيل إشعارات الهاتف الآن' : 'Enable Push Notifications'}</span>
            </button>
          )}
        </div>
      </div>

      {status === 'denied' && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl p-3 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>
            {isRtl
              ? 'تنبيه: تم حظر الإشعارات لهذا الموقع من إعدادات المتصفح. اضغط على أيقونة القفل بجانب شريط العنوان واختر "السماح بالإشعارات" ثم أعد المحاولة.'
              : 'Notice: Notifications are blocked for this site in your browser settings. Please allow notifications in site settings.'}
          </span>
        </div>
      )}
    </div>
  );
};
