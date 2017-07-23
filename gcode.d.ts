declare module "gcode" {
    export interface GCodeLine {
        N: number | null;
        words: any[];
    }

    export function parseString(line: string, callback: (err: Error, result: GCodeLine[]) => void): void;
}
