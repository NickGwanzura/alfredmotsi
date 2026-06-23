import webpush from 'web-push';
import { prisma } from '@/app/lib/db';

let configured = false;
function ensureVapid() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  webpush.setVapidDetails('mailto:admin@splashaircrmzw.site', pub, priv);
  configured = true;
}

export async function sendPushToUsers(userIds: string[], payload: { title: string; body: string; url?: string }) {
  try {
    ensureVapid();
    if (!configured) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        ),
      ),
    );
  } catch {
    // Never throw — push failures should not break the main flow
  }
}
