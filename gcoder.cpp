#include <node.h>

#include <iostream>
#include <fstream>
#include <cmath>
#include <cstring>
#include <cstdlib>

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


void Initialize(v8::Local<v8::Object> exports) {
	NODE_SET_METHOD(exports, "TimeFile", TimeFile);
}

NODE_MODULE(module_name, Initialize)