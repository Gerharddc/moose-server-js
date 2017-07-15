import Heater from "./heater";
import * as Serial from "./serial";

const heaters: Heater[] = [];

heaters.push(new Heater(0, "Ext 1"));
heaters.push(new Heater(1, "Heatbed"));

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
    // TODO
    // Set relative movement
    Serial.sendLine("G91");

    let dist = distance;
    if (!forward) {
        dist *= -1;
    }

    let line = "G1 ";
    if (axis in ["x", "y", "z", "e"]) {
        line += axis.toUpperCase() + dist;
    } else {
        throw new Error("Unkown axis: " + axis);
    }

    line += " F" + speed;
    Serial.sendLine(line);
}

export function printFile(fileName: string) {
    /*let lineReader = new LineByLineReader(rootPath + fileName);

    lineReader.on('line', line => {
        lineReader.pause();

        let res = Serial.sendLine(line);
        if (res instanceof Promise)
            res.then(m => lineReader.resume());
        else
            lineReader.resume();
    });

    lineReader.on('error', err => {
        // TODO
        console.log('Linereader error: ' + err);
    });

    lineReader.on('end', () => {
        // TODO: notify done with file
    })*/
    Serial.sendFile(fileName);
}
