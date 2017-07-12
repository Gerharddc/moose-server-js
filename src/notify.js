// @flow

export type WebSocket = { send: (message: string) => void };

let clients: Array<WebSocket> = [];

export function Notify(systemName: string, _id: number, _property: string, setter: WebSocket) : void {
    const resp = JSON.stringify({
        status: 'notify',
        systemname: systemName,
        id: _id,
        property: _property
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
    clients = clients.filter(item => item !== ws);
}