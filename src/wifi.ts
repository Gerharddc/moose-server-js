import * as ConnMan from "connman-node-api";
import * as WebSocket from "uws";
import { Notify } from "./notify";

class SSID {
    public Name: string;
    public Secured: boolean;
}

const ssids: SSID[] = [];

const connman = new ConnMan();
let wifi: ConnMan.Technology | null = null;
connman.init((err) => {
    if (err instanceof Error) {
        console.log(err.message);
        return;
    }

    // tslint:disable-next-line:no-string-literal
    wifi = connman.technologies["WiFi"];

    if (!wifi) {
        console.log("Could not get wifi technology");
    }

    connman.Agent.on("Release", () => {
        console.log("Connman agent release");
    });

    connman.Agent.on("ReportError", (path, error) => {
        console.log("Connaman agent ReportError:");
        console.log(error);
    });

    connman.Agent.on("RequestBrowser", (path, url) => {
        console.log("Connman agent RequestBrowser");
    });

    connman.Agent.on("RequestInput", (path, dict, callback) => {
        console.log("Connman agent RequestInput: ");
        console.log(dict);
        /*
                if ('Passphrase' in dict) {
                    callback({ 'Passphrase': '12345' });
                }
        */
    });

    connman.Agent.on("Cancel", () => {
        console.log("Connman agent canceled");
    });
});

export function getSSIDS() {
    return ssids;
}

export function scanWifi() {
    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    console.log("Scanning...");
    wifi.scan(() => {
        // Getting list of access points
        wifi!.listAccessPoints((err, list) => {
            console.log("Got " + list.length + " Access Point(s)");

            ssids.length = 0;
            for (const ap of list) {
                ssids.push({
                    Name: ap.Name,
                    Secured: ap.Security !== "none",
                });
            }
        });
    });
}

let connectedSSID = "";
let connectingPassword = "";

export function connectSSID(ssid: string, password: string) {
    // TODO

    if (ssid === connectedSSID) {
        return;
    }

    /*let ss = null;
    for (const s of ssids) {
        if (s.Name === ssid) {
            ss = s;
        }
    }

    if (!ss) {
        throw new Error("SSID not available");
    }

    if (ss.Secured && password === "") {
        throw new Error("SSID requires a password");
    }*/

    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    wifi.findAccessPoint(ssid, (err, service) => {
        if (!service) {
            throw new Error("No such access point");
        }

        service.connect((error, agent) => {
            if (error) {
                console.log("Wifi connect error: " + error);
            }
        });

        service.on("PropertyChanged", (name, value) => {
            console.log(name + " = " + value);
            if (name === "State") {
                switch (value) {
                case "failure":
                    console.log("Connection failed"); // TODO
                    break;
                case "association":
                    console.log("Associating ...");
                    break;
                case "configuration":
                    console.log("Configuring ...");
                    break;
                case "online":
                    console.log("Online...");
                case "ready":
                    console.log("Connected");
                    break;
                }
            }
        });
    });

    // connectedSSID = ssid;
    // Notify("Wifi", 0, "ConnectedSSID", null);
}

export function getConnectedSSID() {
    // TODO

    return connectedSSID;
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

export function getHosting() {
    return Hosting;
}

export function setHosting(hosting: boolean, ssid: string, passphrase: string,
    client: WebSocket) {
    // TODO
    /*Hosting = hosting;
    HostingSSID = ssid;
    HostingPWD = passphrase;

    if (hosting) {
        conState = "hosting";
    } else {
        conState = "inactive";
    }

    console.log("Constate now: " + conState);
    Notify("Wifi", 0, "ConnectionState", null);*/

    if (hosting !== Hosting) {
        Hosting = hosting;
        HostingSSID = ssid;
        HostingPWD = passphrase;
    }

    Notify("Wifi", 0, "Hosting", client);
}
