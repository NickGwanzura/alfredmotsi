import { Prisma } from '@prisma/client';

/** Reassign every user-owned record before deleting a duplicate account. */
export async function mergeUserRecords(tx: Prisma.TransactionClient, duplicateId: string, keepId: string): Promise<void> {
  const jobs = await tx.job.findMany({
    where: { OR: [{ technicians: { some: { id: duplicateId } } }, { coTechnicians: { some: { id: duplicateId } } }] },
    select: { id: true, technicians: { select: { id: true } }, coTechnicians: { select: { id: true } } },
  });

  for (const job of jobs) {
    const technicianIds = [...new Set([...job.technicians.map((user) => user.id), keepId])];
    const coTechnicianIds = [...new Set([...job.coTechnicians.map((user) => user.id), keepId])];
    await tx.job.update({
      where: { id: job.id },
      data: {
        technicians: { set: technicianIds.map((id) => ({ id })) },
        coTechnicians: { set: coTechnicianIds.map((id) => ({ id })) },
      },
    });
  }

  await Promise.all([
    tx.account.updateMany({ where: { userId: duplicateId }, data: { userId: keepId } }),
    tx.session.updateMany({ where: { userId: duplicateId }, data: { userId: keepId } }),
    tx.pushSubscription.updateMany({ where: { userId: duplicateId }, data: { userId: keepId } }),
    tx.technicianAvailability.updateMany({ where: { userId: duplicateId }, data: { userId: keepId } }),
    tx.auditLog.updateMany({ where: { userId: duplicateId }, data: { userId: keepId } }),
    tx.gasUsageRecord.updateMany({ where: { usedBy: duplicateId }, data: { usedBy: keepId } }),
    tx.consumable.updateMany({ where: { recordedBy: duplicateId }, data: { recordedBy: keepId } }),
    tx.jobAttachment.updateMany({ where: { uploadedBy: duplicateId }, data: { uploadedBy: keepId } }),
    tx.cRMRecord.updateMany({ where: { by: duplicateId }, data: { by: keepId } }),
    tx.fundAllocation.updateMany({ where: { techId: duplicateId }, data: { techId: keepId } }),
    tx.fundAllocation.updateMany({ where: { createdById: duplicateId }, data: { createdById: keepId } }),
    tx.fundExpense.updateMany({ where: { recordedById: duplicateId }, data: { recordedById: keepId } }),
  ]);

  await tx.user.delete({ where: { id: duplicateId } });
}
