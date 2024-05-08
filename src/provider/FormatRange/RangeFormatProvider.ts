import type * as vscode from 'vscode';
import { getConfig } from '../../configUI';
import { EFormatChannel } from '../../globalEnum';
import { FormatCore, FormatCoreWrap } from '../Format/FormatProvider';

export const RangeFormatProvider: vscode.DocumentRangeFormattingEditProvider = {
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        return FormatCoreWrap(FormatCore({
            document,
            options,
            fmtStart: range.start.line,
            fmtEnd: range.end.line,
            from: EFormatChannel.byFormatRange,
            cmdTo1_or_2: getConfig().format.removeFirstCommaCommand,
        }));
    },
};
