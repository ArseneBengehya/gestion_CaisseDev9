import type { DepenseNotificationData } from '@/src/types';

export const genererNotificationDepense = ({ montant, motif, approuvePar }: DepenseNotificationData) => ({
  titre: 'Nouvelle dépense',
  message: `Le groupe a dépensé ${montant.toLocaleString('fr-FR')} FC pour ${motif}, approuvé par ${approuvePar}.`,
  type: 'alerte' as const,
});

export const formaterDateNotification = (value: string | Date, now = new Date()): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Récemment';

  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateKey = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (dateKey(date) === dateKey(now)) return `Aujourd'hui à ${time}`;
  if (dateKey(date) === dateKey(yesterday)) return `Hier à ${time}`;
  return `${date.toLocaleDateString('fr-FR')} à ${time}`;
};
