const { prisma } = require('../config/prisma');

async function listNotifications(personid) {
  const id = parseInt(personid, 10);
  const notifications = await prisma.notification.findMany({
    where: { personid: id },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    items: notifications.map((n) => ({
      id: String(n.notification_id),
      type: n.type || 'system',
      title: n.tittle,
      message: n.notificationcontent,
      href: n.href || '',
      isRead: n.is_read ?? false,
      createdAt: n.created_at.toISOString(),
    })),
    unreadCount,
  };
}

async function markAsRead(personid, notificationId) {
  const id = parseInt(personid, 10);
  const nid = parseInt(notificationId, 10);
  await prisma.notification.updateMany({
    where: { notification_id: nid, personid: id },
    data: { is_read: true },
  });
  return { message: 'Marked as read' };
}

async function createNotification(personid, { type, title, message, href }) {
  return prisma.notification.create({
    data: {
      personid,
      tittle: title,
      notificationcontent: message,
      type: type || 'system',
      href: href || null,
    },
  });
}

module.exports = { listNotifications, markAsRead, createNotification };
