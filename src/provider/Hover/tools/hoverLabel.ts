import type * as vscode from 'vscode';
import type { CAhkLabel } from '../../../AhkSymbol/CAhkLine';
import type { TAhkFileData } from '../../../core/ProjectManager';
import type { TAhkTokenLine } from '../../../globalEnum';
import { EDetail } from '../../../globalEnum';
import { findLabel } from '../../../tools/labels';

/** */
export function hoverLabel(
    AhkFileData: TAhkFileData,
    position: vscode.Position,
    wordUp: string,
): vscode.MarkdownString | null {
    const { DocStrMap } = AhkFileData;

    const AhkTokenLine: TAhkTokenLine = DocStrMap[position.line];
    const { lStr, detail } = AhkTokenLine;
    const lStrFix: string = lStr.slice(0, Math.max(0, position.character));

    if (detail.includes(EDetail.isLabelLine)) {
        // OnExit , Label
        const label: CAhkLabel | null = findLabel(wordUp);
        if (label !== null) return label.md;
    }

    if ((/[#$@\w\u{A1}-\u{FFFF}]*$/iu).test(lStrFix)) {
        const s2: string = lStrFix.replace(/[#$@\w\u{A1}-\u{FFFF}]*$/iu, '')
            .replace(/,?[ \t]*$/u, '')
            .trim();
        if ((/\b(?:goto|goSub|Break|Continue|OnExit)$/iu).test(s2)) {
            const label: CAhkLabel | null = findLabel(wordUp);
            if (label !== null) return label.md;
        }
        // OnExit , Label
    }

    return null;
}
