//@flow

import child_process from 'child_process';

let roomForLines = false;

let worker_process = child_process.fork(__dirname + '/serialWorker.js');
worker_process.on('message', msg => {
    switch (msg.type) {
        case 'roomForLines':
            roomForLines = msg.roomForLines;
            break;
        case 'callResolve':
            msg.resolve();
            break;
    }
});

export function sendCode(code: string) {
    worker_process.send({
        action: 'sendCode',
        code
    });
}

export function resetLineNum(): void {
    worker_process.send({
        action: 'resetLineNum'
    });
}

// Synchronously sends line as soon as there is room
export function sendLine(line: string) {
    if (roomForLines) {
        worker_process.send({
            action: 'sendLine',
            line
        });
    }
    else {
        return new Promise((resolve, reject) => {
            worker_process.send({
                action: 'sendLine',
                line,
                resolve,
                reject
            })
        });
    }
}

export function sendFile(filePath: string) {
    worker_process.send({
        action: 'sendFile',
        filePath
    });
}
