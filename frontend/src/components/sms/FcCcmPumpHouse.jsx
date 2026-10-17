import React from 'react';
import { Plug } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function FcCcmPumpHouse() {
  return (
    <SmsSheetPage title="FURNACE PUMP HOUSE" back="Electrical" backTo="/sms/electrical">
      <SmsSheetCard label="PUMP HOUSE MOTOR PANEL" sub="Motor current · drive · panel check" icon={Plug} color="blue" sheet="pump-house-motor" fill="/sms/pump-house-motor/new" history="/sms/pump-house-motor/history" />
      <SmsSheetCard label="CCM PUMP HOUSE" sub="Motor current · drive · panel check" icon={Plug} color="blue" sheet="ccm-pump-house" fill="/sms/ccm-pump-house/new" history="/sms/ccm-pump-house/history" />
    </SmsSheetPage>
  );
}
