import * as WebSocket from "ws";

let clients: WebSocket[] = [];

export function Notify(systemName: string, id: number, property: string, setter?: WebSocket | null) {
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

export function NotifyError(error: string) {
    const resp = JSON.stringify({
        error,
        status: "error",
    });

    clients.forEach((client) => {
        client.send(resp);
    });
}

export function AddClient(ws: WebSocket) {
    clients.push(ws);
}

export function RemoveClient(ws: WebSocket) {
    clients = clients.filter((item) => item !== ws);
}
