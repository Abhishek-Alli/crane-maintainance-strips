import React from 'react';
import { Cog } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function SlabCaster() {
  return (
    <SmsSheetPage title="SLAB CASTER" back="Billet and Slab Caster" backTo="/sms/billet-slab-caster">
      <SmsSheetCard label="SLAB STRAND 1" sub="Coming soon" icon={Cog} color="teal" />
      <SmsSheetCard label="SLAB STRAND 2" sub="Coming soon" icon={Cog} color="teal" />
    </SmsSheetPage>
  );
}
