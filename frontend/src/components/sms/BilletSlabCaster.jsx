import React from 'react';
import { Cog } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function BilletSlabCaster() {
  return (
    <SmsSheetPage title="BILLET AND SLAB CASTER" back="Electrical" backTo="/sms/electrical">
      <SmsSheetCard label="CCM MOTOR" sub="Motor current · drive · starter check" icon={Cog} color="teal" sheet="ccm-motor" fill="/sms/ccm-motor/new" history="/sms/ccm-motor/history" />
    </SmsSheetPage>
  );
}
