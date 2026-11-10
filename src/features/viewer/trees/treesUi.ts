/** WS-C local UI state (not part of the shared viewer store contract). */
import {create} from 'zustand';

interface TreesUiState {
  /** Thinning overlay: red rings on trees flagged for removal + spacing-conflict links. */
  thinning: boolean;
  setThinning: (v: boolean) => void;
}

export const useTreesUi = create<TreesUiState>()((set) => ({
  thinning: false,
  setThinning: (thinning) => set({thinning}),
}));
