// @flow

import type { WebSocket } from './notify';
import * as Printer from './printer';
import { scanWifi, getSSIDS, connectSSID } from './wifi';
import * as Files from './files';

let handlerFunctions = {
    SetTargetTemp: function(data: any, client: WebSocket) {
        if (typeof data.id !== 'number') {
            throw new Error("HandleSetTargetTemp-Error: no id");
        }

        if (typeof data.temp !== 'number') {
            throw new Error("HandleSetTargetTemp-Error: no temp");
        }

        try {
            Printer.getHeater(data.id).setTargetTemp(data.temp, client);
        }
        catch (e) {
            throw new Error('HandleSetTargetTemp-Error: ' + e.message)
        }
    },

    GetTargetTemp: function(data: any, client: WebSocket): number {
        if (typeof data.id !== 'number') {
            throw new Error("HandleGetTargetTemp-Error: no id");
        }

        try {
            return Printer.getHeater(data.id).targetTemp;
        }
        catch (e) {
            throw new Error('HandleGetTargetTemp-Error: ' + e.message)
        }
    },

    GetHeaters: function(data: any, client: WebSocket) {
        return Printer.getHeaterList();
    },

    GetHeater: function(data: any, client: WebSocket) {
        if (typeof data.id !== 'number') {
            throw new Error("HandleGetHeater-Error: no id");
        }

        try {
            let h = Printer.getHeater(data.id);
            return {
                displayName: h.displayName,
                isOn: h.heating,
                target: h.targetTemp,
                current: h.currentTemp
            };
        }
        catch (e) {
            throw new Error('HandleGetHeater-Error: ' + e.message)
        }
    },

    SetHeating: function(data: any, client: WebSocket) {
        if (typeof data.id !== 'number') {
            throw new Error("HandleSetHeating-Error: no id");
        }

        if (typeof data.heating !== 'boolean') {
            throw new Error("HandleSetHeating-Error: no heating");
        }

        try {
            Printer.getHeater(data.id).setHeating(data.heating, client);
        }
        catch (e) {
            throw new Error('HandleGetHeater-Error: ' + e.message)
        }
    },

    GetHeating: function(data: any, client: WebSocket): boolean {
        if (typeof data.id !== 'number') {
            throw new Error("HandleGetHeating-Error: no id");
        }

        try {
            return Printer.getHeater(data.id).heating;
        }
        catch (e) {
            throw new Error('HandleGetHeater-Error: ' + e.message)
        }
    },

    ScanWifi: function (data: any, client: WebSocket) {
        try {
            scanWifi();
        }
        catch (e) {
            throw new Error('ScanWifi-Error: ' + e.message)
        }
    },

    GetSSIDS: function (data: any, client: WebSocket): Array<string> {
        try {
            return getSSIDS();
        }
        catch (e) {
            throw new Error('GetSSIDS-Error: ' + e.message)
        }
    },

    ConnectSSID: function (data: any, client: WebSocket) {
        try {
            connectSSID(data.ssid);
        }
        catch (e) {
            throw new Error('ConnectSSID: ' + e.message)
        }
    },

    MoveAxis: function (data: any, client: WebSocket) {
        try {
            Printer.moveAxis(data.distance, data.speed, data.forward, data.axis);
        }
        catch (e) {
            throw new Error('MoveAxis-Error: ' + e.message)
        }
    },

    GetFiles: function (data: any, client: WebSocket) {
        try {
            return Files.listFiles();
        }
        catch (e) {
            throw new Error('GetFiles-Error: ' + e.message)
        }
    },

    PrintFile: function (data: any, client: WebSocket) {
        try {
            return Printer.printFile(data.fileName);
        }
        catch (e) {
            throw new Error('PrintFile: ' + e.message)
        }
    }
};

export function HandleRequest(message: string, client: WebSocket): string {
    let id = undefined;
    try {
        let req = JSON.parse(message);
        id = req.id;

        if (typeof req.request instanceof 'string') {
            throw new Error("HandleRequest: no request");
        }

        if (typeof req.id !== 'number') {
            throw new Error("HandleRequest: no id");
        }

        var resp = handlerFunctions[req.request](req.data, client);
        if (resp === undefined) {
            resp = null;
        }

        return JSON.stringify({
            status: 'success',
            id: req.id,
            request: req.request,
            response: resp
        })
    }
    catch (e) {
        return JSON.stringify({
            status: 'error',
            error: e.message,
            id
        })
    }
}