import * as child_process from "child_process";
import * as Printer from "./printer";

let roomForLines = false;

const workerProcess = child_process.fork(__dirname + "/serialWorker.js");
workerProcess.on("message", (msg) => {
    switch (msg.type) {
        case "roomForLines":
            roomForLines = msg.roomForLines;
            break;
        case "callResolve":
            msg.resolve();
            break;
        case "notifyPrintDone":
            notifyPrintDone();
            break;
    }
});

function notifyPrintDone() {
    Printer.donePrint();
}

export function sendCode(code: string) {
    workerProcess.send({
        action: "sendCode",
        code,
    });
}

export function resetLineNum(): void {
    workerProcess.send({
        action: "resetLineNum",
    });
}

// Synchronously sends line as soon as there is room
export function sendLine(line: string) {
    if (roomForLines) {
        workerProcess.send({
            action: "sendLine",
            line,
        });
    } else {
        return new Promise((resolve, reject) => {
            workerProcess.send({
                action: "sendLine",
                line,
                reject,
                resolve,
            });
        });
    }
}

export function sendFile(filePath: string) {
    workerProcess.send({
        action: "sendFile",
        filePath,
    });
}

export function pauseFileSend() {
    workerProcess.send({
        action: "pauseFile",
    });
}

export function resumeFileSend() {
    workerProcess.send({
        action: "resumeFile",
    });
}

export function stopFileSend() {
    workerProcess.send({
        action: "stopFile",
    });
}
