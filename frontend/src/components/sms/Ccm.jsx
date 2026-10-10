import React from 'react';
import { Layers, Square } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function Ccm() {
  return (
    <SmsSheetPage title="CCM" back="Dashboard" backTo="/sms/dashboard">
      <SmsSheetCard to="/sms/ccm-combo" label="CCM COMBO" sub="Pump House · Parameter · Hydraulic · Casting Break" icon={Layers} color="indigo" />
      <SmsSheetCard label="CCM SLAB" icon={Square} color="teal" />
    </SmsSheetPage>
  );
}
