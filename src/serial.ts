import * as child_process from "child_process";
import { NotifyError } from "./notify";
import * as Printer from "./printer";

const workerProcess = child_process.fork(__dirname + "/serialWorker.js");
workerProcess.on("message", (msg) => {
    switch (msg.type) {
        case "callResolve":
            msg.resolve(msg.resp);
            break;
        case "notifyPrintDone":
            notifyPrintDone();
            break;
        case "emitTemps":
            Printer.tempUpdateEmitter.emitBedTemp(msg.bedTemp);
            Printer.tempUpdateEmitter.emitExtTemp(msg.extTemp);
            break;
        case "timeLeft":
            Printer.updateTimeLeft(msg.timeLeft);
        case "error":
            NotifyError(msg.error);
            break;
    }
});

process.on("exit", () => {
    workerProcess.kill();
});

if (!workerProcess) {
    console.log("O fok forking error!");
}

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
    return new Promise((resolve, reject) => {
        workerProcess.send({
            action: "sendLine",
            line,
            reject,
            resolve,
        });
    });
}

export function sendFile(filePath: string, fileTime: number) {
    workerProcess.send({
        action: "sendFile",
        filePath,
        fileTime,
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
