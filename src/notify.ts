import * as WebSocket from "uws";

let clients: WebSocket[] = [];

export function Notify(systemName: string, id: number, property: string, setter: WebSocket) {
    const resp = JSON.stringify({
        id,
        property,
        status: "notify",
        systemname: systemName,
    });

    clients.forEach((client) => {
        if (client !== setter) {
            client.send(resp);
        }
    });
}

export function AddClient(ws: WebSocket) {
    clients.push(ws);
}

export function RemoveClient(ws: WebSocket) {
    clients = clients.filter((item) => item !== ws);
}
