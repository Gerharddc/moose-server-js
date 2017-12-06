import { NotifyInfo } from './notify';
import * as EventEmitter from 'events';

class TempUpdateEmitter extends EventEmitter {
    public emitBedTemp(temp: number) {
        this.emit("BedTemp", temp);
    }

    public emitExtTemp(temp: number) {
        this.emit("ExtTemp", temp);
    }
}

export const tempUpdateEmitter = new TempUpdateEmitter();

import * as Files from './files';
import Heater from "./heater";
import * as Notify from './notify';

const heaters: Heater[] = [];

// tslint:disable-next-line:no-var-requires
const Printer = require("../build/Release/printer.node");

export function Init() {
    Printer.OpenPort("/dev/ttyACM0", (type: string, data: any) => {

        switch (type) {
            case "alltemp":
                tempUpdateEmitter.emitBedTemp(data);
                tempUpdateEmitter.emitExtTemp(data);
                console.log("temp: " + data);
                break;
            case "etemp":
                tempUpdateEmitter.emitExtTemp(data);
                break;
            case "btemp":
                tempUpdateEmitter.emitBedTemp(data);
                break;
            case "harderror":
                console.log("Hardware error");
                Notify.NotifyError("Hardware error, firmware shut down");
            case "unknown":
                console.log("unknown: " + data);
                break;
        }
    });

    process.on("exit", () => {
        Printer.ClosePort();
    });

    heaters.push(new Heater(0, "Extruder"));
    heaters.push(new Heater(1, "Heatbed", true));

    setInterval(() => {
        try {
            Printer.RequestTemp();
        } catch (e) {
            console.log("Temp exception: " + e);
        }
    }, 2000);
}

export function SendLine(line: string) {
    Printer.SendLine(line);
}

export function getHeater(id: number): Heater {
    for (const heater of heaters) {
        if (heater.ID === id) {
            return heater;
        }
    }

    throw new Error("Heater id not found");
}

export function getHeaterList(): number[] {
    const idxs: number[] = [];
    for (const heater of heaters) {
        idxs.push(heater.ID);
    }

    return idxs;
}

export function moveAxis(distance: number, speed: number, forward: boolean, axis: string) {
    // Set relative movement
    Printer.SendLine("G91");

    let dist = distance;
    if (!forward) {
        dist *= -1;
    }

    let line = "G1 ";
    if (["x", "y", "z", "e"].indexOf(axis) > -1) {
        line += axis.toUpperCase() + dist;
    } else {
        throw new Error("Unkown axis: " + axis);
    }

    // mm/s to mm/minute
    line += " F" + (speed * 60);
    Printer.SendLine(line);
}

export function homeAxis(axis: string) {
    let line = "G28 ";
    if (["x", "y", "z"].indexOf(axis) > -1) {
        line += axis.toUpperCase();
    } else if (axis === "a") {
        line += "X Y Z";
    } else {
        throw new Error("Unkown axis: " + axis);
    }

    Printer.SendLine(line);
}

let fileTime = 0;
let printedTime = 0;
let printing = false;
let paused = false;
let progress = 50;
let eta = "10m 30s";

export function millisToETA(time: number) {
    const hours = Math.floor(time / 3600000);
    time -= hours * 3600000;

    const minutes = Math.floor(time / 60000);
    time -= minutes * 60000;

    const secs = Math.round(time / 1000);

    return `${hours}h ${minutes}m ${secs}s`;
}

export function updateTimeLeft(time: number) {
    printedTime = time;
    progress = Math.round(time / fileTime * 10000) / 100;

    eta = millisToETA(fileTime - time);

    Notify.Notify("Printer", 0, "Progress", null);
    Notify.Notify("Printer", 0, "ETA", null);
}

export function getPrinting() {
    return printing;
}

export function getPaused() {
    return paused;
}

export function getProgress() {
    return progress;
}

export function getETA() {
    return eta;
}

function setPrinting(val: boolean) {
    printing = val;
    Notify.Notify("Printer", 0, "Printing", null);
}

function setPaused(val: boolean) {
    paused = val;
    Notify.Notify("Printer", 0, "Paused", null);
}

export async function printFile(fileName: string) {
    fileTime = await Files.getFileTime(fileName);
    updateTimeLeft(fileTime);

    Printer.SendFile(Files.readyPath + fileName, (type: string, data: any) => {
        if (type === "time") {
            updateTimeLeft(data);
        } else {
            console.log(type + ": " + data);
        }
    });

    updateTimeLeft(0);

    setPrinting(true);
}

import * as LineByLineReader from 'line-by-line';

export async function uploadFile(fileName: string) {
    console.log('Uploading', fileName);
    
    Printer.SendLine('M28 ' + fileName);
    const lr = new LineByLineReader(Files.readyPath + fileName);
    
    lr.on('error', (err) => {
        console.log('LineReader error', err);
    });

    lr.on('line', (line) => {
        Printer.SendLine(line);
    });

    lr.on('end', () => {
        console.log('Done uploading');
        NotifyInfo('Done uploading');
        Printer.SendLine('M29');
    });
}

export function pauseFilePrint() {
    Printer.PausePrint();
    setPaused(true);
}

export function resumeFilePrint() {
    Printer.ResumePrint();
    setPaused(false);
}

export function stopFilePrint() {
    Printer.StopPrint();
    setPrinting(false);
}

export function donePrint() {
    setPrinting(false);
}
