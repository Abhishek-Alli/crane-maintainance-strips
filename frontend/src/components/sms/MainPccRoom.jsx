import React from 'react';
import { Flame, CalendarCheck, Building2, Wind, Fuel, Zap } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function MainPccRoom() {
  return (
    <SmsSheetPage title="MAIN PCC ROOM" back="Electrical" backTo="/sms/electrical">
      <SmsSheetCard label="FURNACE POLLUTION" sub="Panel · drives · motor currents" icon={Flame} color="orange" sheet="furnace-pollution" fill="/sms/furnace-pollution/new" history="/sms/furnace-pollution/history" />
      <SmsSheetCard label="FURNACE POLLUTION - SCHEDULED" sub="Hood · RAV · Vibrator Motor · Solonoid Coil" icon={CalendarCheck} color="amber" sheet="furnace-pollution-pm" fill="/sms/furnace-pollution-pm/new" history="/sms/furnace-pollution-pm/history" />
      <SmsSheetCard label="PCC ROOM - SCHEDULED" icon={Building2} color="indigo" />
      <SmsSheetCard label="COMPRESSOR - SCHEDULED" sub="Coolent and filter · motor current" icon={Wind} color="cyan" sheet="compressor-pm" fill="/sms/compressor-pm/new" history="/sms/compressor-pm/history" />
      <SmsSheetCard label="DG" sub="Diesel refill · air cleaning · running hours" icon={Fuel} color="rose" sheet="dg" fill="/sms/dg/new" history="/sms/dg/history" />
      <SmsSheetCard label="LT TRANSFORMER" sub="Oil level · OTI/WTI · silica gel · OLTC" icon={Zap} color="purple" sheet="lt-transformer" fill="/sms/lt-transformer/new" history="/sms/lt-transformer/history" />
    </SmsSheetPage>
  );
}
