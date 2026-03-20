export type TriggerType = 'entry_digit' | 'digit_pattern';

export interface EntryDigitTrigger {
    enabled: boolean;
    entryDigit: number;
    triggerOnEntry: boolean;
    monitorTicks: number;
    consecutive: number;
    type: 'Over' | 'Under' | 'Even' | 'Odd' | 'Match' | 'Diff';
    targetValue: number;
}

export type PatternStep = 'E' | 'O' | 'D' | 'M' | 'V' | 'U' | 'SE' | 'SO';

export interface DigitPatternTrigger {
    enabled: boolean;
    pattern: PatternStep[];
    compareDigit: number;
}

export interface TriggerState {
    entryDigit: EntryDigitTrigger;
    digitPattern: DigitPatternTrigger;
}
