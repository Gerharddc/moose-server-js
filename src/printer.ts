import * as EventEmitter from "events";

class TempUpdateEmitter extends EventEmitter {
    public emitBedTemp(temp: number) {
        this.emit("BedTemp", temp);
    }

    public emitExtTemp(temp: number) {
        this.emit("ExtTemp", temp);
    }
}

export const tempUpdateEmitter = new TempUpdateEmitter();

import * as Files from "./files";
import Heater from "./heater";
import * as Notify from "./notify";
import * as Serial from "./serial";

const heaters: Heater[] = [];

heaters.push(new Heater(0, "Extruder"));
heaters.push(new Heater(1, "Heatbed", true));

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
    Serial.sendLine("G91");

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
    Serial.sendLine(line);
}

export function homeAxis(axis: string) {
    let line = "G28 ";
    if (["x", "y", "z", "e"].indexOf(axis) > -1) {
        line += axis.toUpperCase();
    } else {
        throw new Error("Unkown axis: " + axis);
    }

    Serial.sendLine(line);
}

let fileTime = 0;
let timeLeft = 0;
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
    timeLeft = time;
    progress = Math.round((fileTime - timeLeft) / fileTime * 10000) / 100;

    eta = millisToETA(time);
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
    Serial.sendFile(fileName, fileTime);
    setPrinting(true);
}

export function pauseFilePrint() {
    Serial.pauseFileSend();
    setPaused(true);
}

export function resumeFilePrint() {
    Serial.resumeFileSend();
    setPaused(false);
}

export function stopFilePrint() {
    Serial.stopFileSend();
    setPrinting(true);
}

export function donePrint() {
    setPrinting(false);
}
