/** WS-I. Stocking status counts — reserved status colours, always with icon + label. */
import {AlertTriangle, CheckCircle2, CircleDashed, XCircle} from 'lucide-react';
import {useChartPalette} from '../lib/palette';
import {STOCKING_LABEL, STOCKING_STATUS_KEY, type StockingClass} from '../lib/stocking';
import {BarList} from './BarList';

const ICON = {stocked: CheckCircle2, satisfactory: AlertTriangle, below: XCircle, unknown: CircleDashed};
const ORDER: StockingClass[] = ['stocked', 'satisfactory', 'below', 'unknown'];

export function StockingBreakdown({counts, unit = 'blocks'}: {counts: Record<StockingClass, number>; unit?: string}) {
  const p = useChartPalette();
  return (
    <BarList
      color={p.series}
      items={ORDER.map((k) => {
        const Icon = ICON[k];
        const color = p.status[STOCKING_STATUS_KEY[k]];
        return {
          id: k,
          label: STOCKING_LABEL[k],
          icon: <Icon size={13} style={{color}} />,
          value: counts[k],
          display: `${counts[k]} ${unit}`,
          color,
        };
      })}
    />
  );
}
