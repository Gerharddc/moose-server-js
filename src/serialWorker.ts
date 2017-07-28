import * as EventEmitter from "events";
import * as LineByLineReader from "line-by-line";
import * as SerialPort from "serialport";
import { readyPath } from "./files";

// tslint:disable-next-line:no-var-requires
const GCoder = require("../build/Release/gcoder");

class PrintFlow extends EventEmitter {
    private paused: boolean = false;
    private stopped: boolean = true;

    public pasuePrint() {
        this.paused = true;
        this.emit("pause");
    }

    public resumePrint() {
        this.paused = false;
        this.emit("resume");
    }

    public startPrint() {
        this.stopped = false;
        this.emit("start");
    }

    public stopPrint() {
        this.stopped = true;
        this.emit("stop");
    }

    get Paused(): boolean {
        return this.paused;
    }

    get Stopped(): boolean {
        return this.stopped;
    }
}

const printFlow = new PrintFlow();

process.on("message", (msg) => {
    switch (msg.action) {
        case "sendCode":
            // sendCode(msg.code);
            break;
        case "sendLine":
            // sendLine(msg.line, msg.resolve, msg.reject, true);
            sendLine(msg.line);
            break;
        case "resetLineNum":
            // resetLineNum();
            break;
        case "sendFile":
            sendFile(msg.filePath, msg.fileTime);
            break;
        case "pauseFile":
            printFlow.pasuePrint();
            break;
        case "resumeFile":
            printFlow.resumePrint();
            break;
        case "stopFile":
            printFlow.stopPrint();
            break;
    }
});

const port = GCoder.OpenPort("/dev/ttyACM0");
console.log("Port: " + port);

function sendLine(line: string) {
    if (port !== -1) {
        console.log("sending: " + line);
        GCoder.SendLine(port, line);
    }
}

function sendFile(fileName: string, fileTime: number) {
    if (port !== -1) {
        console.log("sending: " + readyPath + fileName);
        GCoder.SendFile(port, readyPath + fileName, (dat: number) => {
            console.log(dat);
        });
    }
}

/*let port: SerialPort | null = null;
try {
    port = new SerialPort("/dev/ttyACM0", {
        baudRate: 460800,
        parser: SerialPort.parsers.readline("\n"),
        xoff: true,
        xon: true,
    });

    port.on("error", (err) => {
        console.log("SerialPort-error: " + err);
    });

    port.on("open", () => {
        console.log("Port open");
        port!.write("M111 S0\n");
    });

    port.on("data", (data) => {
        handleSerialResponse(data);
    });

} catch (e) {
    console.log("SerialPort-error: " + e.message);
}

function reportError(error: string) {
    if (process.send) {
        process.send({
            error,
            type: "error",
        });
    }
}

export function sendCode(code: string) {
    if (port === null) {
        reportError("Printer serial port not open for reading");
        return;
    }

    port.write(code + "\n");
}

let curLineNum = 1;

export function resetLineNum(): void {
    sendCode("M110 N0");
    curLineNum = 0;
}

const sentLineMap: Map<number, any> = new Map();
let sentLines = 0;
const maxSentLines = 50;

function incrementLineNum() {
    // Wrap line numbers if needed
    curLineNum++;
    if (curLineNum > 100000) {
        resetLineNum();
    }
}

type CallBack = (msg?: string) => void;

const roomResolves: CallBack[] = [];

function waitForLinesRoom() {
    return new Promise((resolve, reject) => {
        if (sentLines < maxSentLines) {
            resolve();
        } else {
            roomResolves.push(resolve);
        }
    });
}

function resolveLinesRoom() {
    // TODO: make sure this works
    while (sentLines < maxSentLines && roomResolves.length > 0) {
        const resolve = roomResolves.shift();
        if (resolve) {
            resolve();
        }
    }
}

// Synchronously sends line
// it is assumed they don't have comments
function sendLine(line: string, resolve?: CallBack | undefined,
    reject?: CallBack | undefined, externalResolve = false) {
    if (port === null) {
        reportError("Printer serial port not open for writing");
        return;
    }

    line = "N" + curLineNum + " " + line + " *";

    // Add checksum
    let cs = 0;
    for (let i = 0; line[i] !== "*" && line[i] !== null; i++) {
        // tslint:disable-next-line:no-bitwise
        cs = cs ^ line.charCodeAt(i);
    }
    // tslint:disable-next-line:no-bitwise
    cs &= 0xff;
    line += cs;

    // console.log("Sending line: " + line);
    sendCode(line);

    sentLineMap.set(curLineNum, {
        externalResolve,
        line,
        reject,
        resolve,
    });

    sentLines++;
    incrementLineNum();
}

async function sendLineAsync(line: string) {
    return new Promise((resolve, reject) => {
        sendLine(line, resolve, reject);
    });
}

/*setInterval(async () => {
    sendCode("M105");
}, 1000);*

function readTemp(resp: string) {
    const regex = /T:(\d+\.?\d+) B:(\d+\.?\d+)/;
    const extract = regex.exec(resp);

    let t: number | null = null;
    let b: number | null = null;
    if (extract && extract[1] && extract[2]) {
        t = Number.parseFloat(extract[1]);
        b = Number.parseFloat(extract[2]);
    }

    if (t && b) {
        if (process.send) {
            process.send({
                bedTemp: b,
                extTemp: t,
                type: "emitTemps",
            });
        }
    } else {
        console.log("Invalid temp response: " + resp);
    }
}

function handleSerialResponse(resp: string): void {
    if (resp.includes("rs")) {
        const ln = Number(resp.split(" "[1]));
        sendCode(String(sentLineMap.get(ln)));
    } else if (resp.includes("ok")) {
        if (resp.includes("T:")) {
            readTemp(resp);
        } else {
            sentLines--;
            let ln = Number(resp.split(" "[1]));

            if (!ln) {
                ln = sentLineMap.keys().next().value;
            }

            const line = sentLineMap.get(ln);
            let resolve;
            let externalResolve;
            if (line) {
                resolve = line.resolve;
                externalResolve = line.externalResolve;
            }

            sentLineMap.delete(ln);
            if (resolve) {
                if (externalResolve && process.send) {
                    process.send({
                        resolve,
                        resp,
                        type: "callResolve",
                    });
                } else {
                    resolve(resp);
                }
            }

            resolveLinesRoom();
        }
    } else {
        console.log("Serial: " + resp);
    }
}

function reportTimeLeft(timeLeft: number) {
    if (process.send) {
        process.send({
            timeLeft,
            type: "timeLeft",
        });
    }
}

let lineReader: LineByLineReader | null = null;

printFlow.on("pause", () => {
    if (lineReader) {
        lineReader.pause();
    }
});

printFlow.on("resume", () => {
    if (lineReader) {
        lineReader.resume();
    }
});

printFlow.on("stop", () => {
    if (lineReader) {
        lineReader.pause();
        lineReader.close();
    }
});

function sendFile(fileName: string, fileTime: number) {
    lineReader = new LineByLineReader(readyPath + fileName);

    printFlow.startPrint();
    console.log("Sending: " + readyPath + fileName);

    lineReader.on("line", async (line) => {
        /*if (printFlow.Paused || printFlow.Stopped) {
            return;
        }*
        // console.log("Line: " + line);

        // lineReader!.pause();

        // Decode the line back to a gcode string
        const parts = line.split(";");
        const gcode = parts[0];
        const time = parseFloat(parts[1]);

        // await waitForLinesRoom();
        // sendLineAsync(gcode);
        if (port) {
            port.write(gcode + "\n");
        }

        fileTime -= time;
        reportTimeLeft(fileTime);

        // lineReader!.resume();
    });

    lineReader.on("error", (err) => {
        // TODO
        console.log("Linereader error: " + err);
    });

    lineReader.on("end", () => {
        console.log("Reader done");

        if (process.send) {
            process.send({
                type: "notifyPrintDone",
            });
        }

        lineReader = null;
    });
}*/

console.log("Serial worker");
