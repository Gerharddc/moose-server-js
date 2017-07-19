import * as ConnMan from "connman-node-api";
import * as WebSocket from "uws";
import { Notify } from "./notify";

class SSID {
    public Name: string;
    public Secured: boolean;
}

const ssids: SSID[] = [];

let connected = false;
let connectedSSID = "";
let connectingPassword = "";

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

        if ("Passphrase" in dict) {
            callback({ Passphrase: connectingPassword });
        }

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

export function connectSSID(ssid: string, password: string) {
    if (ssid === connectedSSID) {
        return;
    }

    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    connectingPassword = password;

    wifi.findAccessPoint(ssid, (err, service) => {
        if (!service) {
            throw new Error("No such access point");
        }

        const notifyConnected = () => {
            connected = true;
            connectedSSID = ssid;
            Notify("Wifi", 0, "ConnectedSSID", null);
            Notify("Wifi", 0, "Connected", null);
        };

        const notifyDisConnected = () => {
            connected = false;
            connectedSSID = "";
            Notify("Wifi", 0, "ConnectedSSID", null);
            Notify("Wifi", 0, "Connected", null);
        };

        service.connect((error, agent) => {
            if (error) {
                console.log("Wifi connect error: " + error);
                notifyDisConnected();
            } else {
                connected = true;
                notifyConnected();
            }
        });

        service.on("PropertyChanged", (name, value) => {
            console.log(name + " = " + value);
            if (name === "State") {
                switch (value) {
                    case "failure":
                        console.log("Connection failed");
                        notifyDisConnected();
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
                        notifyConnected();
                        break;
                }
            }
        });
    });
}

export function getConnectedSSID() {
    return connectedSSID;
}

export function getConnected() {
    return connected;
}

export function disconnect() {
    // TODO
}

let Hosting = false;
let HostingSSID = "MooseNet";
let HostingPWD = "MoosePass";

export function getHosting() {
    return Hosting;
}

export function getHostingSSID() {
    return HostingSSID;
}

export function getHostingPWD() {
    return HostingPWD;
}

export function startHosting(ssid: string, pwd: string, client: WebSocket) {
    if (ssid !== HostingSSID) {
        HostingSSID = ssid;
        Notify("Wifi", 0, "HostingSSID", client);
    }

    if (pwd !== HostingPWD) {
        HostingPWD = pwd;
        Notify("Wifi", 0, "HostingPWD", client);
    }

    if (!Hosting) {
        Hosting = true;
        Notify("Wifi", 0, "Hosting", client);
    }

    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    wifi.enableTethering(HostingSSID, HostingPWD, (err) => {
        if (!err) {
            console.log("Tethering enabled");
        } else {
            console.log(err);
        }
    });
}

export function stopHosting(client: WebSocket) {
    if (Hosting) {
        Hosting = false;
        Notify("Wifi", 0, "Hosting", client);
    }

    if (!wifi) {
        throw new Error("Wifi technology not available");
    }

    wifi.disableTethering((err, res) => {
        if (!err) {
            console.log("Tethering disabled");
        } else {
            console.log(err);
        }
    });
}
