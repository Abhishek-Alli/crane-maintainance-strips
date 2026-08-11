import { smsAPI, hsmAPI } from '../../services/api';

export const BREAKDOWN_MODULE = {
  sms: {
    key: 'sms',
    label: 'SMS',
    title: 'SMS Dashboard',
    sub: 'SMS · RCA & 5-Why analysis',
    base: '/sms',
    api: smsAPI,
    color: 'amber',
    ring: 'focus:ring-amber-500',
    btn: 'bg-amber-600 hover:bg-amber-700',
    btnSoft: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    textDark: 'text-amber-800',
    textStrong: 'text-amber-900',
    border: 'border-amber-100',
    bgSoft: 'bg-amber-50/40',
    bgHeader: 'bg-amber-800',
    spinner: 'border-amber-600',
    hoverCard: 'hover:border-amber-300 hover:bg-amber-50',
    hoverRow: 'hover:bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-800',
    pdfPrefix: 'sms_breakdown_analysis',
  },
  hsm: {
    key: 'hsm',
    label: 'HSM',
    title: 'HSM Dashboard',
    sub: 'HSM · RCA & 5-Why analysis',
    base: '/hsm',
    api: hsmAPI,
    color: 'indigo',
    ring: 'focus:ring-indigo-500',
    btn: 'bg-indigo-600 hover:bg-indigo-700',
    btnSoft: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    textDark: 'text-indigo-800',
    textStrong: 'text-indigo-900',
    border: 'border-indigo-100',
    bgSoft: 'bg-indigo-50/40',
    bgHeader: 'bg-indigo-800',
    spinner: 'border-indigo-600',
    hoverCard: 'hover:border-indigo-300 hover:bg-indigo-50',
    hoverRow: 'hover:bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-800',
    pdfPrefix: 'hsm_breakdown_analysis',
  },
};

export function getBreakdownModule(moduleKey = 'sms') {
  return BREAKDOWN_MODULE[moduleKey] || BREAKDOWN_MODULE.sms;
}
