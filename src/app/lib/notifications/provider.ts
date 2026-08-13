import { prisma } from '@/app/lib/db';

export type ServiceNotificationEvent =
  | 'quote.sent'
  | 'job.booked'
  | 'job.technician_assigned'
  | 'job.on_route'
  | 'job.completed'
  | 'invoice.sent'
  | 'payment.received'
  | 'maintenance.due';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export interface NotificationMessage {
  event: ServiceNotificationEvent;
  channel: NotificationChannel;
  recipient?: string;
  customerId?: string;
  jobId?: string;
  referenceId?: string;
  payload: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly name: string;
  supports(channel: NotificationChannel): boolean;
  send(message: NotificationMessage): Promise<{ id?: string }>;
}

class PlaceholderProvider implements NotificationProvider {
  readonly name = 'placeholder';
  supports() { return false; }
  async send() { return {}; }
}

let provider: NotificationProvider = new PlaceholderProvider();

export function configureNotificationProvider(next: NotificationProvider) {
  provider = next;
}

export async function emitServiceNotification(message: NotificationMessage) {
  const event = await prisma.notificationEvent.create({
    data: {
      event: message.event,
      channel: message.channel,
      recipient: message.recipient || null,
      customerId: message.customerId || null,
      jobId: message.jobId || null,
      referenceId: message.referenceId || null,
      provider: provider.name,
      status: provider.supports(message.channel) ? 'sending' : 'pending',
      payload: message.payload as object,
    },
  });

  if (!provider.supports(message.channel)) return event;

  try {
    await provider.send(message);
    return prisma.notificationEvent.update({
      where: { id: event.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  } catch (error) {
    return prisma.notificationEvent.update({
      where: { id: event.id },
      data: { status: 'failed', error: error instanceof Error ? error.message : String(error) },
    });
  }
}
