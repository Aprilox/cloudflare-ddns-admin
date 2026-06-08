import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

async function sendDiscordTestMessage(webhookUrl: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Test de notification Discord pour le système DDNS - Configuration réussie !',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message Discord:', error);
    return false;
  }
}

async function sendTelegramTestMessage(botToken: string, chatId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Test de notification Telegram pour le système DDNS - Configuration réussie !',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message Telegram:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
  const body = await req.json()
  const notifications = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    update: {
      discord: body.discord,
      discordWebhook: body.discordWebhook,
      telegram: body.telegram,
      telegramBotToken: body.telegramBotToken,
      telegramChatId: body.telegramChatId,
    },
    create: {
      discord: body.discord,
      discordWebhook: body.discordWebhook,
      telegram: body.telegram,
      telegramBotToken: body.telegramBotToken,
      telegramChatId: body.telegramChatId,
    }
  })

  let discordTestStatus = false;
  let telegramTestStatus = false;

  if (notifications.discord && notifications.discordWebhook) {
    discordTestStatus = await sendDiscordTestMessage(notifications.discordWebhook);
  }

  if (notifications.telegram && notifications.telegramBotToken && notifications.telegramChatId) {
    telegramTestStatus = await sendTelegramTestMessage(notifications.telegramBotToken, notifications.telegramChatId);
  }

  return NextResponse.json({
    ...notifications,
    discordTestStatus,
    telegramTestStatus,
  })
  } catch (error) {
    console.error('Error saving notification settings:', error)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde des notifications' }, { status: 500 })
  }
}

export async function GET() {
  const notifications = await prisma.notificationSettings.findUnique({
    where: { id: 1 }
  }) || {
    id: 1,
    discord: false,
    discordWebhook: '',
    telegram: false,
    telegramBotToken: '',
    telegramChatId: '',
  };
  return NextResponse.json(notifications);
}

