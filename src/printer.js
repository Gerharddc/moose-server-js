// @flow

import Heater from './heater';

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
}

export function printFile(fileName: string) {
    // TODO
}