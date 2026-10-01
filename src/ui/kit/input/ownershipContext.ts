import { createContext, useContext, useEffect, useRef } from 'react';
import type { InputBoundaryReason, InputOwner, InputRelease } from './ownership';

export interface InputOwnershipContextValue {
	suspended: boolean;
	register: (owner: InputOwner, release: InputRelease) => () => void;
	releaseMomentary: (reason: InputBoundaryReason) => void;
	suspend: (reason: InputBoundaryReason) => void;
	resume: () => void;
}

export const DEFAULT_INPUT_OWNERSHIP_CONTEXT: InputOwnershipContextValue = {
	suspended: false,
	register: () => () => {},
	releaseMomentary: () => {},
	suspend: () => {},
	resume: () => {},
};

export const InputOwnershipContext = createContext<InputOwnershipContextValue>(DEFAULT_INPUT_OWNERSHIP_CONTEXT);

/** Register one modality without coupling the hook to product state. */
export function useInputOwnership(owner: InputOwner, release: InputRelease): InputOwnershipContextValue {
	const context = useContext(InputOwnershipContext);
	const releaseRef = useRef(release);
	useEffect(() => {
		releaseRef.current = release;
	}, [release]);
	useEffect(() => context.register(owner, reason => releaseRef.current(reason)), [context.register, owner]);
	return context;
}

export function useInputOwnershipContext(): InputOwnershipContextValue {
	return useContext(InputOwnershipContext);
}
