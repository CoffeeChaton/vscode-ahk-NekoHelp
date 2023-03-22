import * as vscode from 'vscode';
import type { TAhkFileData } from '../../core/ProjectManager';
import type { TAhkTokenLine, TTokenStream } from '../../globalEnum';
import { FormatCoreWrap } from '../../provider/Format/FormatProvider';
import type { TFmtCore, TFmtCoreMap } from '../../provider/Format/FormatType';
import { fmtLog } from '../../provider/vscWindows/log';
import { CommandMDMap } from '../../tools/Built-in/Command.tools';

type TCmdSwitchComma = {
    col: number,
    AhkTokenLine: TAhkTokenLine,
};

function getCmdSwitchCommaList(DocStrMap: TTokenStream, s: number, e: number): readonly TCmdSwitchComma[] {
    const result: TCmdSwitchComma[] = [];
    const logList: string[] = ['"match cmd" : ['];
    for (let i = s; i <= e; i++) {
        const AhkTokenLine: TAhkTokenLine = DocStrMap[i];
        const {
            fistWordUp,
            fistWordUpCol,
            SecondWordUp,
            SecondWordUpCol,
            lStr,
            textRaw,
            line,
        } = AhkTokenLine;
        if (fistWordUp === '') continue;

        if (CommandMDMap.has(fistWordUp)) {
            const col: number = fistWordUp.length + fistWordUpCol;
            if (lStr.trimEnd().length !== col) {
                result.push({
                    col,
                    AhkTokenLine,
                });
                logList.push(`    ${line} -> "${textRaw.slice(fistWordUpCol, lStr.length).trim()}"`);
                continue;
            }
        } else if (CommandMDMap.has(SecondWordUp)) {
            const col: number = SecondWordUp.length + SecondWordUpCol;
            if (lStr.trimEnd().length !== col) {
                result.push({
                    col,
                    AhkTokenLine,
                });
                logList.push(`    ${line} -> "${textRaw.slice(SecondWordUpCol, lStr.length).trim()}"`);
            }
        }
    }

    logList.push(']');
    fmtLog.info(logList.join('\n'));
    return result;
}

function RemoveFirstOptComma(list: readonly TCmdSwitchComma[]): TFmtCoreMap {
    const map = new Map<number, TFmtCore>();
    for (const { col, AhkTokenLine } of list) {
        const { textRaw, line } = AhkTokenLine;
        const strF: string = textRaw.slice(col).trim();
        if ((/^,[ \t]*[^, \t]/u).test(strF)) {
            map.set(line, {
                line,
                oldText: textRaw,
                newText: textRaw.slice(0, col).trimEnd() + strF.replace(/^,\s*/u, ' ').trimEnd(),
                hasOperatorFormat: false,
            });
        }
    }
    return map;
}

function addFirstOptComma(list: readonly TCmdSwitchComma[]): TFmtCoreMap {
    const map = new Map<number, TFmtCore>();
    for (const { col, AhkTokenLine } of list) {
        const { textRaw, line } = AhkTokenLine;
        const strF: string = textRaw.slice(col).trim();
        if ((/^[^,]/u).test(strF)) {
            map.set(line, {
                line,
                oldText: textRaw,
                newText: textRaw.slice(0, col).trimEnd() + strF.replace(/^\s*/u, ', ').trimEnd(),
                hasOperatorFormat: false,
            });
        }
    }
    return map;
}

function applyVscodeEdit(map: TFmtCoreMap): vscode.TextEdit[] {
    const logList: string[] = [];
    for (const { line, oldText, newText } of map.values()) {
        logList.push(
            `    {   line : ${line}`,
            `        oldText : '${oldText}',`,
            `        newText : '${newText}',`,
            '    },',
        );
    }

    if (logList.length > 0) {
        fmtLog.info([
            '"try apply" :[',
            ...logList,
            ']',
        ].join('\n'));
    } else {
        fmtLog.info('"not any to apply" : [ ]');
    }

    return FormatCoreWrap(map);
}

export async function CmdFirstCommaStyleSwitch(
    AhkFileData: TAhkFileData,
    selection: vscode.Selection,
): Promise<void> {
    type TCommand = {
        label: string,
        fn: (list: readonly TCmdSwitchComma[]) => TFmtCoreMap,
    };

    const select: TCommand | undefined = await vscode.window.showQuickPick<TCommand>([
        {
            label: '1 -> try "Sleep, 1000" -> "Sleep 1000" ; (Remove first optional comma after command)',
            fn: RemoveFirstOptComma,
        },
        {
            label: '2 -> try "Sleep 1000" -> "Sleep, 1000" ; (add first optional comma after command)',
            fn: addFirstOptComma,
        },
        // {
        //     label: '3 -> try "#Warn, All, MsgBox" -> "#Warn All, MsgBox" ; (Remove first optional comma after command)',
        //     fn: RemoveFirstOptComma, // FIXME
        // },
        // {
        //     label: '4 -> try "#Warn All, MsgBox" -> "#Warn, All, MsgBox" ; (add first optional comma after command)',
        //     fn: addFirstOptComma, // FIXME
        // },
    ], {
        title: 'I am moving this command to the formatting options',
    });

    if (select === undefined) return;
    const t1: number = Date.now();

    const { label, fn } = select;
    fmtLog.info(`'${label}'`);

    const { DocStrMap, uri } = AhkFileData;
    const { start, end } = selection;
    const s: number = start.line;
    const e: number = end.line;
    fmtLog.info(`select range of line [${s}, ${e}]`);
    const list: readonly TCmdSwitchComma[] = getCmdSwitchCommaList(DocStrMap, s, e);

    const diffMap: TFmtCoreMap = fn(list);

    const editList: vscode.TextEdit[] = applyVscodeEdit(diffMap);
    if (editList.length > 0) {
        const WorkspaceEdit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
        WorkspaceEdit.set(uri, editList);
        await vscode.workspace.applyEdit(WorkspaceEdit);
        const ms: number = Date.now() - t1;
        fmtLog.info(`ms : -> ${ms} , of '${label}'`);
        fmtLog.show();
    }
}
