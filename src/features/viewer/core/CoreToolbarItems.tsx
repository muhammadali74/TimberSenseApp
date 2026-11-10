/** WS-B owns. Phase 0: colour-mode buttons wired to the store (the shader honours them once WS-B lands). */
import {Button} from '@/components/ui';
import {type ColorMode, useViewerStore} from '../store';

const MODES: {id: ColorMode; label: string}[] = [
  {id: 'rgb', label: 'RGB'},
  {id: 'instance', label: 'Trees'},
  {id: 'semantic', label: 'Class'},
  {id: 'height', label: 'Height'},
];

export function CoreToolbarItems() {
  const colorMode = useViewerStore((s) => s.colorMode);
  const setColorMode = useViewerStore((s) => s.setColorMode);
  return (
    <>
      {MODES.map((m) => (
        <Button key={m.id} size="sm" variant="ghost" active={colorMode === m.id} onClick={() => setColorMode(m.id)}>
          {m.label}
        </Button>
      ))}
    </>
  );
}
