import React from 'react';
import { Power, Layers, Cpu, Wrench, Zap } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function FurnaceSide() {
  return (
    <SmsSheetPage title="FURNACE SIDE" back="Electrical" backTo="/sms/electrical">
      <SmsSheetCard label="FURNACE STAND BY" sub="Sensors · hydraulic limit · RTD" icon={Power} color="indigo" sheet="furnace-stand-by" fill="/sms/furnace-stand-by/new" history="/sms/furnace-stand-by/history" />
      <SmsSheetCard label="BUNDLE PRESS" sub="Motors · starters · solonoid coils · proximity sensors" icon={Layers} color="teal" sheet="bundle-press" fill="/sms/bundle-press/new" history="/sms/bundle-press/history" />
      <SmsSheetCard label="FURNACE MOTOR PANEL" sub="Motor current · drive · starter · panel check" icon={Cpu} color="orange" sheet="furnace-motor-panel" fill="/sms/furnace-motor-panel/new" history="/sms/furnace-motor-panel/history" />
      <SmsSheetCard label="FURNACE POKER" sub="Panel · proximity · remote · motor currents" icon={Wrench} color="cyan" sheet="furnace-poker" fill="/sms/furnace-poker/new" history="/sms/furnace-poker/history" />
      <SmsSheetCard label="FURNACE TRANSFORMER" sub="Oil level · OTI/WTI · silica gel · oil pump" icon={Zap} color="purple" sheet="furnace-transformer" fill="/sms/furnace-transformer/new" history="/sms/furnace-transformer/history" />
    </SmsSheetPage>
  );
}
