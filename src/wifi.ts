import * as ConnMan from "connman-node-api";
import { Notify } from "./notify";

const ssids: string[] = [];

const connman = new ConnMan();
connman.init((err) => {
    if (err instanceof Error) {
        console.log(err.message);
    }
});

export function getSSIDS() {
    return ssids;
}

export function scanWifi() {
    console.log("Called for scan");
}

export function connectSSID(ssid: string) {
    // TODO
}

export function getConnectedSSID() {
    // TODO
}

let conState = "inactive";
export function getConnectionState() {
    return conState;
}

export function disconnect() {
    // TODO
}

let Hosting = false;
let HostingSSID = "";
let HostingPWD = "";

export function setHosting(hosting: boolean, ssid: string, passphrase: string) {
    // TODO
    Hosting = hosting;
    HostingSSID = ssid;
    HostingPWD = passphrase;

    if (hosting) {
        conState = "hosting";
    } else {
        conState = "inactive";
    }

    Notify("wifi", 0, "connctionState", null);
}
