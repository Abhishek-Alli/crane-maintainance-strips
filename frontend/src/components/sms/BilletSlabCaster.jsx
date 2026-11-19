import React from 'react';
import { Cog, Factory } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function BilletSlabCaster() {
  return (
    <SmsSheetPage title="BILLET AND SLAB CASTER" back="Electrical" backTo="/sms/electrical">
      <SmsSheetCard label="CCM MOTOR" sub="Motor current · drive · starter check" icon={Cog} color="teal" sheet="ccm-motor" fill="/sms/ccm-motor/new" history="/sms/ccm-motor/history" />
      <SmsSheetCard to="/sms/billet-caster" label="BILLET CASTER" sub="Billet Strand 1 · Billet Strand 2" icon={Factory} color="orange" />
      <SmsSheetCard to="/sms/slab-caster" label="SLAB CASTER" sub="Slab Strand 1 · Slab Strand 2" icon={Factory} color="indigo" />
      <SmsSheetCard label="COMMON MOTOR" sub="Tundish car · ladle sequence car · slide gate" icon={Cog} color="blue" sheet="common-motor" fill="/sms/caster-motor/common-motor/new" history="/sms/caster-motor/common-motor/history" />
    </SmsSheetPage>
  );
}
