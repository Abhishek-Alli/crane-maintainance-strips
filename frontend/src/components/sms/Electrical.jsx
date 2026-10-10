import React from 'react';
import { Flame, Factory, Plug, Cog } from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';

export default function Electrical() {
  return (
    <SmsSheetPage title="ELECTRICAL" back="Dashboard" backTo="/sms/dashboard">
      <SmsSheetCard to="/sms/furnace-side" label="FURNACE SIDE" sub="Stand By · Bundle Press · Motor Panel · Poker · Transformer" icon={Flame} color="orange" />
      <SmsSheetCard to="/sms/main-pcc-room" label="MAIN PCC ROOM" sub="Furnace Pollution · DG · LT Transformer" icon={Factory} color="indigo" />
      <SmsSheetCard to="/sms/fc-ccm-pump-house" label="FC AND CCM PUMP HOUSE" sub="Pump House Motor Panel" icon={Plug} color="blue" />
      <SmsSheetCard to="/sms/billet-slab-caster" label="BILLET AND SLAB CASTER" sub="CCM Motor" icon={Cog} color="teal" />
    </SmsSheetPage>
  );
}
