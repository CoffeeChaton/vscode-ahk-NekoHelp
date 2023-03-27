import * as vscode from 'vscode';
import type { TParamMapIn, TParamMetaIn } from '../../AhkSymbol/CAhkFunc';
import type { TTokenStream } from '../../globalEnum';
import { replacerSpace } from '../str/removeSpecialChar';
import { ToUpCase } from '../str/ToUpCase';

type TParamData = {
    isByRef: boolean,
    isVariadic: boolean,
    keyRawName: string,
};

function getKeyRawName(param: string): TParamData {
    const isByRef: boolean = (/^ByRef\s+/iu).test(param);
    const key0: string = isByRef
        ? param.replace(/^ByRef\s+/iu, '')
        : param;
    const isVariadic: boolean = param.endsWith('*'); // https://www.autohotkey.com/docs/v1/Functions.htm#Variadic
    const keyRawName: string = isVariadic
        ? key0.replace(/\*$/u, '')
        : key0;
    return {
        isByRef,
        isVariadic,
        keyRawName,
    };
}

function getParamDefNeed(
    param: string,
    line: number,
    ch: number,
    lineComment: string,
): TParamMetaIn {
    const { isByRef, isVariadic, keyRawName } = getKeyRawName(param);
    const range: vscode.Range = new vscode.Range(
        new vscode.Position(line, ch),
        new vscode.Position(line, ch + keyRawName.length),
    );

    // eslint-disable-next-line security/detect-unsafe-regex
    const parsedErrRange: vscode.Range | null = (/^[#$@\w\u{A1}-\u{FFFF}]+$/u).test(keyRawName)
        ? null
        : range;

    return {
        keyRawName,
        defRangeList: [range],
        refRangeList: [],
        parsedErrRange,
        isByRef,
        isVariadic,
        c502Array: [0],
        commentList: [
            lineComment.startsWith(';')
                ? lineComment.slice(1)
                : '',
        ],
    };
}

export function getParamDef(fnName: string, selectionRange: vscode.Range, DocStrMap: TTokenStream): TParamMapIn {
    // 113 ms self time
    const paramMap: TParamMapIn = new Map<string, TParamMetaIn>();
    const startLine: number = selectionRange.start.line;
    const endLine: number = selectionRange.end.line;
    for (const { lStr, line, lineComment } of DocStrMap) {
        if (line < startLine) continue;
        if (line > endLine) break;
        let lStrFix: string = lStr;
        // eslint-disable-next-line security/detect-unsafe-regex
        if (startLine === line) lStrFix = lStrFix.replace(/^[ \t}]*[#$@\w\u{A1}-\u{FFFF}]+\(/u, replacerSpace);
        if (endLine === line) {
            lStrFix = lStrFix
                .replace(/\{\s*$/u, replacerSpace)
                .replace(/\)\s*$/u, replacerSpace);
        }

        if (lStrFix.trim() === '') break;

        const strF: string = lStrFix
            .replaceAll(/:?=\s*[-+]?[.x\da-f^]+/giu, replacerSpace); // Test 0x00ffffff  , -0.5 , 0.8

        const strF2: string = strF.replaceAll(/\bByRef\b/giu, replacerSpace);

        for (const ma of strF.matchAll(/\s*([^,]+),?/gu)) {
            const param: string = ma[1].trim();
            if (param === '') continue;

            const find: string = param.replace(/\bByRef\b\s*/iu, '');
            const ch: number = strF2.indexOf(find, ma.index);

            const ArgAnalysis: TParamMetaIn = getParamDefNeed(param, line, ch, lineComment);

            const key: string = ToUpCase(ArgAnalysis.keyRawName);
            paramMap.set(key, ArgAnalysis);
        }
    }

    return paramMap;
}
