#include <node.h>
#include <iostream>
#include <fstream>
#include <cmath>
#include <cstring>
#include <cstdlib>

#include <stdio.h>
#include <fcntl.h>
#include <termios.h>
#include <unistd.h>
#include <errno.h>

const int maxValue = 10;
int numberOfCalls = 0;

struct Poses {
		float X = 0;
		float Y = 0;
		float Z = 0;
};

struct TempPoses {
		int G = -1;
		float F = -1;
		float X = -1;
		float Y = -1;
		float Z = -1;
};

void TimeFile(const v8::FunctionCallbackInfo<v8::Value>& args) {
	v8::Isolate* isolate = args.GetIsolate();

	// Check arguments
	if (args.Length() < 3) {
		isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Wrong number of arguments")
		));
		return;
	}

	if (!args[0]->IsString() || !args[1]->IsString() || !args[2]->IsFunction()) {
		isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Wrong argument types")
		));
		return;
	}

	v8::String::Utf8Value param1(args[0]->ToString());
	v8::String::Utf8Value param2(args[1]->ToString());

	v8::Local<v8::Function> cb = v8::Local<v8::Function>::Cast(args[2]);

	std::ifstream inFile(*param1);
	std::ofstream outFile(*param2);

	inFile.seekg(0, std::ifstream::end);
	double max = inFile.tellg();
	inFile.seekg(0, std::ifstream::beg);

	Poses lastPoses;
	double fileTime = 0;

	float lastFs[2] = {0};

	bool goingRelative = false;
	int lastProg = -1;

	char lineBuf[150];
	while(inFile.getline(lineBuf, 150)) {
		if (lineBuf[0] ==  ';')
			continue;

		uint8_t bufSize = 0;
		bool running = true;
		while (running && bufSize < 149) {
			char b = lineBuf[bufSize];
			if (b == ';' || b == '\0') {
				running = false;
			} else {
				bufSize++;
			}
		}

		// Make the last character a space to trigger the
		// below code
		lineBuf[bufSize] = ' ';

		TempPoses temp;

		uint8_t startIdx = 0;
		uint8_t endIdx = 0;
		while (endIdx <= bufSize) {
			if (lineBuf[endIdx] == ' ') {
				const char* numStr = &(lineBuf[startIdx + 1]);
				switch (lineBuf[startIdx]) {
					case 'X':
						temp.X = strtof(numStr, NULL);
						break;
					case 'Y':
						temp.Y = strtof(numStr, NULL);
						break;
					case 'Z':
						temp.Z = strtof(numStr, NULL);
						break;
					case 'G':
						temp.G = strtof(numStr, NULL);
						break;
					case 'F':
						temp.F = strtof(numStr, NULL);
						break;
				}

				startIdx = endIdx + 1;
			}

			endIdx++;
		}

		double lineTime = 0;

		const int g = temp.G;
		if (g == 0 || g == 1) {
			if (temp.F > 0) {
				lastFs[g] = temp.F / 60000.0;
			}

			float dist = 0;

#define DOAXIS(A) \
			if (temp.A > 0) { \
				const float now = temp.A; \
				if (goingRelative) { \
					dist += pow(now, 2); \
					lastPoses.A += now; \
				} else { \
					dist += pow(now - lastPoses.A, 2); \
					lastPoses.A = now; \
				}\
			}

			DOAXIS(X);
			DOAXIS(Y);
			DOAXIS(Z);

			dist = sqrt(dist);

			// Calculate the time in milliseconds
			lineTime = (dist / lastFs[g]) * 1.1;
			fileTime += lineTime;
		} else if (g == 90) {
			goingRelative = false;
		} else if (g== 91) {
			goingRelative = true;
		}

		int prog = round((double)inFile.tellg() / max * 100.0);
		if (prog != lastProg) {
			lastProg = prog;

			v8::Local<v8::Value> argv[1] = {v8::Number::New(isolate, static_cast<double>(prog))};
			cb->Call(v8::Null(isolate), 1, argv);
		}

		lineBuf[bufSize] = '\0';
		outFile << lineBuf << ";" <<  lineTime << '\n';
	}

	outFile.flush();
	inFile.close();
	outFile.close();

	args.GetReturnValue().Set(v8::Number::New(isolate, static_cast<double>(fileTime)));
}

void OpenPort(const v8::FunctionCallbackInfo<v8::Value>& args) {
	v8::Isolate* isolate = args.GetIsolate();
	v8::String::Utf8Value param1(args[0]->ToString());

	int fd = open(*param1, O_RDWR | O_NOCTTY);

	if (fd == -1) {
		printf("Could not open serial\n");
		
		args.GetReturnValue().Set(v8::Number::New(isolate, static_cast<double>(-1)));
	} else {
		termios SerialPortSettings;
		tcgetattr(fd, &SerialPortSettings);

		cfsetispeed(&SerialPortSettings,B115200);
		cfsetospeed(&SerialPortSettings,B115200);

		SerialPortSettings.c_cflag &= ~PARENB; // No parity
		SerialPortSettings.c_cflag &= ~CSTOPB; // Stop bits = 1
		SerialPortSettings.c_cflag &= ~CSIZE; // Clears the Mask
		SerialPortSettings.c_cflag |=  CS8;   // Set the data bits
		SerialPortSettings.c_cflag &= ~CRTSCTS; // Turn off hardware flow control
		SerialPortSettings.c_cflag |= (CREAD | CLOCAL); // Turn on receiver
		SerialPortSettings.c_iflag |= (IXON | IXOFF | IXANY); // Turn on software flow control
		//SerialPortSettings.c_iflag &= ~(ICANON | ECHO | ECHOE | ISIG); // Non canonical mode
		SerialPortSettings.c_lflag |= (ICANON | ECHO | ECHOE);

		tcsetattr(fd,TCSANOW,&SerialPortSettings);

		args.GetReturnValue().Set(v8::Number::New(isolate, static_cast<double>(fd)));
	}
}

void ClosePort(const v8::FunctionCallbackInfo<v8::Value>& args) {
	const int fd = args[0]->Uint32Value();
	close(fd);
}

void writeLine(int fd, const char* line, size_t len) {
	char moded[len];
	strncpy(moded, line, len);

	// Change the last character to a newline instead of a null terminator and send
	moded[len] = '\n';
	int bytes_written = write(fd, moded, len + 1);
}

void SendLine(const v8::FunctionCallbackInfo<v8::Value>& args) {
	std::cout << "C++ sending line" << std::endl;

	int fd = args[0]->Uint32Value();
	v8::String::Utf8Value param1(args[1]->ToString());

	const char *line = *param1;
	writeLine(fd, line, strlen(line));

	std::cout << "Writing done" << std::endl;
}

void SendFile(const v8::FunctionCallbackInfo<v8::Value>& args) {
	v8::Isolate* isolate = args.GetIsolate();

	// Check arguments
	if (args.Length() < 3) {
		isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Wrong number of arguments")
		));
		return;
	}

	if (!args[0]->IsUint32() || !args[1]->IsString() || !args[2]->IsFunction()) {
		isolate->ThrowException(v8::Exception::TypeError(
			v8::String::NewFromUtf8(isolate, "Wrong argument types")
		));
		return;
	}

	int fd = args[0]->Uint32Value();
	v8::String::Utf8Value param1(args[1]->ToString());
	v8::Local<v8::Function> cb = v8::Local<v8::Function>::Cast(args[2]);

	std::ifstream inFile(*param1);

	char lineBuf[150];
	while(inFile.getline(lineBuf, 150)) {
		uint8_t sepIdx = 0;
		bool running = true;
		while (running && sepIdx < 149) {
			char b = lineBuf[sepIdx];
			if (b == ';' || b == '\0') {
				running = false;
			} else {
				sepIdx++;
			}
		}

		writeLine(fd, lineBuf, sepIdx);
	}

	inFile.close();
}

void Initialize(v8::Local<v8::Object> exports) {
	NODE_SET_METHOD(exports, "TimeFile", TimeFile);
	NODE_SET_METHOD(exports, "OpenPort", OpenPort);
	NODE_SET_METHOD(exports, "ClosePort", ClosePort);
	NODE_SET_METHOD(exports, "SendFile", SendFile);
	NODE_SET_METHOD(exports, "SendLine", SendLine);
}

NODE_MODULE(module_name, Initialize)