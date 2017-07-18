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

    line += " F" + speed;
    Serial.sendLine(line);
}

let status = "done";

function notifyStatusChange() {
    Notify.Notify("printer", 0, "status", null);
}

export function getStatus(): string {
    return status;
}

export function printFile(fileName: string) {
    status = "printing";
    Serial.sendFile(fileName);
    notifyStatusChange();
}

export function pauseFilePrint() {
    status = "paused";
    Serial.pauseFileSend();
    notifyStatusChange();
}

export function resumeFilePrint() {
    status = "printing";
    Serial.resumeFileSend();
    notifyStatusChange();
}

export function stopFilePrint() {
    status = "done";
    Serial.stopFileSend();
    notifyStatusChange();
}

export function donePrint() {
    status = "done";
    notifyStatusChange();
}
