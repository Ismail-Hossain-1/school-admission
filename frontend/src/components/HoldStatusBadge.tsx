import { CheckCircle2, Clock, XCircle, Ban } from 'lucide-react';
import type { HoldStatus } from '../types/admission';

interface HoldStatusBadgeProps {
  status: HoldStatus;
}

const STATUS_STYLE_MAP: Record<
  HoldStatus,
  { label: string; badgeClass: string; Icon: typeof Clock }
> = {
  HELD: {
    label: 'HELD · আসন সংরক্ষিত',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    Icon: Clock,
  },
  CONFIRMED: {
    label: 'CONFIRMED · ভর্তি নিশ্চিত',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    Icon: CheckCircle2,
  },
  EXPIRED: {
    label: 'EXPIRED · মেয়াদ শেষ',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200',
    Icon: XCircle,
  },
  CANCELLED: {
    label: 'CANCELLED · বাতিল',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    Icon: Ban,
  },
};

export function HoldStatusBadge({ status }: HoldStatusBadgeProps) {
  const { label, badgeClass, Icon } = STATUS_STYLE_MAP[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
