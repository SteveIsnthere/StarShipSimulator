import { createContext } from 'react';
import type { GamepadNavContextValue } from './types';

export const GamepadNavContext = createContext<GamepadNavContextValue | null>(null);
