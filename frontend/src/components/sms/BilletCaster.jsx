import React from 'react';
import { Cog } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function BilletCaster() {
  return (
    <SmsSheetPage title="BILLET CASTER" back="Billet and Slab Caster" backTo="/sms/billet-slab-caster">
      <SmsSheetCard label="BILLET STRAND 1" sub="Motor current · max current alert" icon={Cog} color="teal" sheet="billet-strand-1" fill="/sms/caster-motor/billet-strand-1/new" history="/sms/caster-motor/billet-strand-1/history" />
      <SmsSheetCard label="BILLET STRAND 2" sub="Coming soon" icon={Cog} color="teal" />
    </SmsSheetPage>
  );
}
