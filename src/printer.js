// @flow

import Heater from './heater';
import LineByLineReader from 'line-by-line';
import { rootPath } from './files';
import * as Serial from './serial';

let heaters: Array<Heater> = [];

heaters.push(new Heater(0, "Ext 1"));
heaters.push(new Heater(1, "Heatbed"));

export function getHeater(id: number): Heater {
    for (var i = 0; i < heaters.length; i++) {
        if (heaters[i]._id === id) {
            return heaters[i];
        }
    }

    throw new Error('Heater id not found');
}

export function getHeaterList(): Array<number> {
    let idxs = [];
    heaters.forEach(heater => {
        idxs.push(heater._id)
    });

    return idxs;
}

export function moveAxis(distance: number, speed:number, forward: boolean, axis: string) {
    // TODO
    // Set relative movement
    Serial.sendLine('G91');

    let dist = distance;
    if (!forward)
        dist *= -1;

    let line = 'G1 ';
    if (['x', 'y', 'z', 'e'].includes(axis))
        line += axis.toUpperCase() + dist;
    else
        throw new Error('Unkown axis: ' + axis);

    line += ' F' + speed;
    Serial.sendLine(line);
}

export function printFile(fileName: string) {
    let lineReader = new LineByLineReader(rootPath + fileName);

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
    })
}