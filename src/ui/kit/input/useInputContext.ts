import { useContext } from 'react';
import type { GamepadNavContextValue } from './GamepadNavProvider';
import { GamepadNavContext } from './context';

export function useInputContext(): GamepadNavContextValue {
	const ctx = useContext(GamepadNavContext);
	if (!ctx) throw new Error('useInputContext must be used inside <GamepadNavProvider>');
	return ctx;
}
