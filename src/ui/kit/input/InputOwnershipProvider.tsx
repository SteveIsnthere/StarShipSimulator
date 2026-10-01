import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { InputOwnershipRegistry, type InputBoundaryReason, type InputOwner, type InputRelease } from './ownership';
import { InputOwnershipContext, type InputOwnershipContextValue } from './ownershipContext';

/**
 * Owns browser-level lifecycle boundaries for all input modalities.
 *
 * A boundary releases momentary controls before suspending producers. Focus or
 * visibility recovery resumes producers; route changes are handled by the app
 * adapter because the generic layer must not know product routing.
 */
export function InputOwnershipProvider({ children }: { children: ReactNode }) {
	const registryRef = useRef(new InputOwnershipRegistry());
	const [suspended, setSuspended] = useState(false);

	const register = useCallback((owner: InputOwner, release: InputRelease) =>
		registryRef.current.register(owner, release), []);
	const releaseMomentary = useCallback((reason: InputBoundaryReason) => {
		registryRef.current.releaseMomentary(reason);
	}, []);
	const suspend = useCallback((reason: InputBoundaryReason) => {
		registryRef.current.releaseMomentary(reason);
		setSuspended(true);
	}, []);
	const resume = useCallback(() => setSuspended(false), []);

	useEffect(() => {
		const onBlur = () => suspend('window-blur');
		const onFocus = () => {
			if (!document.hidden) resume();
		};
		const onVisibility = () => {
			if (document.hidden) suspend('document-hidden');
			else resume();
		};
		const onPageHide = () => suspend('pagehide');
		const onPageShow = () => resume();

		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', onFocus);
		window.addEventListener('pageshow', onPageShow);
		window.addEventListener('pagehide', onPageHide);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
			window.removeEventListener('pageshow', onPageShow);
			window.removeEventListener('pagehide', onPageHide);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [resume, suspend]);

	const value = useMemo<InputOwnershipContextValue>(
		() => ({ suspended, register, releaseMomentary, suspend, resume }),
		[suspended, register, releaseMomentary, suspend, resume],
	);

	return <InputOwnershipContext.Provider value={value}>{children}</InputOwnershipContext.Provider>;
}
