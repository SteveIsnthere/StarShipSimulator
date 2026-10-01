export interface InputHint {
	id: string;
	glyph: string;
	keyboard?: string;
	label: string;
	tone?: 'neutral' | 'confirm' | 'back';
}

export interface InputLegendProps {
	hints: readonly InputHint[];
	active: boolean;
	gamepadConnected: boolean;
	className?: string;
}
