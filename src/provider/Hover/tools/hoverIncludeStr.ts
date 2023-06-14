import * as vscode from 'vscode';
import { collectInclude } from '../../../command/tools/collectInclude';
import type { TAhkFileData } from '../../../core/ProjectManager';
import { EDetail } from '../../../globalEnum';

export function hoverIncludeStr(AhkFileData: TAhkFileData, position: vscode.Position): vscode.Hover | null {
    const { DocStrMap, AST } = AhkFileData;
    const { line } = position;
    const { detail, lStr } = DocStrMap[line];

    if (detail.includes(EDetail.isDirectivesLine) && (/^\s*#Include(?:Again)?\s/iu).test(lStr)) {
        for (const ahkInclude of collectInclude(AST)) {
            if (ahkInclude.range.contains(position)) {
                const { mayPath, warnMsg } = ahkInclude.rawData;
                const col0: number = lStr.length - lStr
                    .replace(/^\s*#Include(?:Again)?\s+/iu, '')
                    .replace(/\*i\s+/iu, '')
                    .length;
                const range: vscode.Range = new vscode.Range(
                    new vscode.Position(line, col0),
                    new vscode.Position(line, lStr.length),
                );

                const md: vscode.MarkdownString = new vscode.MarkdownString('', true);
                md.appendCodeblock(`#Include ${mayPath.replaceAll('/', '\\')} ;may be`, 'ahk');
                if (warnMsg !== '') {
                    md.appendMarkdown(warnMsg);
                }

                return new vscode.Hover(md, range);
            }
        }
    }
    return null;
}
