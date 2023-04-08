/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/naming-convention */
import type { TAssociated } from '../../../../../AhkSymbol/CAhkFunc';
import { GuiControlGet_CMD_Pos_Core } from './GuiControlGet_CMD_Pos_Core';
import { SysGet_CMD } from './SysGet_CMD';

export function pseudoArray(
    lStr: string,
    line: number,
    keyWord: string,
    col: number,
): TAssociated | null {
    if (keyWord === 'GuiControlGet'.toUpperCase()) {
        return GuiControlGet_CMD_Pos_Core(lStr, line, col);
    }
    if (keyWord === 'SysGet'.toUpperCase()) {
        return SysGet_CMD(lStr, line, col);
    }

    return null;
}
