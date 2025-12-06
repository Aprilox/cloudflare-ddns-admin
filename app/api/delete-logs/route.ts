import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { type, deleteAll = false } = await req.json();
    const now = new Date();
    const settings = await prisma.logSettings.findFirst() || {
      ipChangeLogRetention: 30,
      actionLogRetention: 30,
      statisticsDataRetention: 90,
    };

    let deletedCount = 0;

    const getRetentionDate = (days: number) => {
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    };

    switch (type) {
      case 'ipChangeLogs':
        if (deleteAll) {
          const result = await prisma.ipChangeLog.deleteMany({});
          deletedCount = result.count;
        } else {
          const ipChangeRetentionDate = getRetentionDate(settings.ipChangeLogRetention);
          const result = await prisma.ipChangeLog.deleteMany({
            where: {
              timestamp: { lt: ipChangeRetentionDate }
            }
          });
          deletedCount = result.count;
        }
        break;
      case 'actionLogs':
        if (deleteAll) {
          const result = await prisma.actionLog.deleteMany({});
          deletedCount = result.count;
        } else {
          const actionLogRetentionDate = getRetentionDate(settings.actionLogRetention);
          const result = await prisma.actionLog.deleteMany({
            where: {
              timestamp: { lt: actionLogRetentionDate }
            }
          });
          deletedCount = result.count;
        }
        break;
      case 'statistics':
        const statsResult = await prisma.ipChangeLog.deleteMany({});
        deletedCount = statsResult.count;
        break;
      case 'all':
        const allIpChangeResult = await prisma.ipChangeLog.deleteMany({});
        const allActionLogResult = await prisma.actionLog.deleteMany({});
        deletedCount = allIpChangeResult.count + allActionLogResult.count;
        break;
      default:
        return NextResponse.json({ error: 'Type de log invalide' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: `${deletedCount} logs supprimés avec succès`, 
      type,
      count: deletedCount 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des logs:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression des logs' }, { status: 500 });
  }
}

