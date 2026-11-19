import React from 'react';
import { Cog } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function SlabCaster() {
  return (
    <SmsSheetPage title="SLAB CASTER" back="Billet and Slab Caster" backTo="/sms/billet-slab-caster">
      <SmsSheetCard label="SLAB STRAND 1" sub="Motor current · max current alert" icon={Cog} color="teal" sheet="slab-strand-1" fill="/sms/caster-motor/slab-strand-1/new" history="/sms/caster-motor/slab-strand-1/history" />
      <SmsSheetCard label="SLAB STRAND 2" sub="Motor current · max current alert" icon={Cog} color="teal" sheet="slab-strand-2" fill="/sms/caster-motor/slab-strand-2/new" history="/sms/caster-motor/slab-strand-2/history" />
    </SmsSheetPage>
  );
}
