import React from 'react';
import {
  Cog, CalendarDays, Flame, Wrench, Droplets, BrickWall, ShoppingCart, Train, Factory, Waves,
} from 'lucide-react';
import SmsSheetCard, { SmsSheetPage } from './SmsSheetCard';
import { TodaySchedule, RecentEotCrane } from './SmsDashboard';

export default function SmsMechanical() {
  return (
    <>
      <SmsSheetPage title="MECHANICAL" back="Dashboard" backTo="/sms/dashboard">
        <SmsSheetCard label="EOT Crane Maintenance" sub="Mechanical · LT · CT · Main Hoist" icon={Cog} color="indigo" sheet="eot-crane" fill="/sms/eot-crane-maintenance/new" history="/sms/eot-crane-maintenance/history" />
        <SmsSheetCard to="/sms/eot-crane-maintenance/calendar" label="EOT Crane Schedule" sub="Calendar · plan cranes by date" icon={CalendarDays} color="violet" />
        <SmsSheetCard label="Crucible Maintenance" sub="Furnace · Coating · Coil In / Coil Out" icon={Flame} color="orange" sheet="crucible" fill="/sms/crucible-maintenance/new" history="/sms/crucible-maintenance/history" />
        <SmsSheetCard label="Hyd Poker Maintenance" sub="Furnace · Hydraulic Poker" icon={Wrench} color="cyan" sheet="poker" fill="/sms/poker-maintenance/new" history="/sms/poker-maintenance/history" />
        <SmsSheetCard label="Pump House — Mechanical" sub="Furnace and CCM · Area · Pump" icon={Droplets} color="blue" sheet="pump-house" fill="/sms/pump-house/new" history="/sms/pump-house/history" />
        <SmsSheetCard label="Patching" sub="Furnace · Lining · Air Pressure" icon={BrickWall} color="rose" sheet="patching" fill="/sms/patching/new" history="/sms/patching/history" />
        <SmsSheetCard label="Scrap Transfer Trolly" sub="Furnace · Gear Box · Hydraulic Power Pack" icon={ShoppingCart} color="teal" sheet="scrap-trolly" fill="/sms/scrap-trolly/new" history="/sms/scrap-trolly/history" />
        <SmsSheetCard label="Ladle Car — Mechanical" sub="Furnace · Gear Box 1 & 2 · Wheel" icon={Train} color="amber" sheet="ladle-car" fill="/sms/ladle-car/new" history="/sms/ladle-car/history" />
        <SmsSheetCard label="Pollution — Daily Check Sheet" sub="Pollution Mechanical · Hoods · ID Fans · Dampers" icon={Factory} color="emerald" sheet="pollution" fill="/sms/pollution/new" history="/sms/pollution/history" />
        <SmsSheetCard label="DM Unit Check List" sub="Furnace · DM Water · Heat Exchanger" icon={Waves} color="purple" sheet="dm-unit" fill="/sms/dm-unit/new" history="/sms/dm-unit/history" />
      </SmsSheetPage>
      <div className="max-w-6xl mx-auto px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TodaySchedule />
        <RecentEotCrane />
      </div>
    </>
  );
}
