import React from 'react';
import { Droplets, SlidersHorizontal, Gauge, Scissors } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function CcmCombo() {
  return (
    <SmsSheetPage title="CCM COMBO" back="CCM" backTo="/sms/ccm">
      <SmsSheetCard label="PUMP HOUSE CHECKLIST" icon={Droplets} color="blue" />
      <SmsSheetCard label="PARAMETER CHECKLIST" icon={SlidersHorizontal} color="indigo" />
      <SmsSheetCard label="HYDRAULIC CHECKLIST" icon={Gauge} color="orange" />
      <SmsSheetCard label="CASTING BREAK WITH FLOORS CHECKLIST" icon={Scissors} color="rose" />
    </SmsSheetPage>
  );
}
