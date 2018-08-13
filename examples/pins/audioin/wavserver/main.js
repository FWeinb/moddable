import AudioIn from "audioin"
import {Server} from "http"

const BytesPerBuffer = 512;

class WavServer extends Server {
	callback(message, value) {
		if (2 == message) {
			trace(`New connection\n`);
			this.sentWavHeader = false;
		}
		else if (8 == message)
			return {headers: ["Content-type", "audio/wav"], body: true};
		else if (9 === message) {
			if (!this.audioIn) {
				this.audioIn = new AudioIn;
				this.samplesRemaining = 6 * this.audioIn.sampleRate;
				trace(`created audioin\n`);
			}

			if (!this.sentWavHeader) {
				const header = new DataView(new ArrayBuffer(44));
				header.setUint8(0, 'R'.charCodeAt());
				header.setUint8(1, 'I'.charCodeAt());
				header.setUint8(2, 'F'.charCodeAt());
				header.setUint8(3, 'F'.charCodeAt());
				header.setUint32(4, 36 + (this.samplesRemaining * this.audioIn.numChannels * (this.audioIn.bitsPerSample >> 3)), true);
				header.setUint8(8, 'W'.charCodeAt());
				header.setUint8(9, 'A'.charCodeAt());
				header.setUint8(10, 'V'.charCodeAt());
				header.setUint8(11, 'E'.charCodeAt());
				header.setUint8(12, 'f'.charCodeAt());
				header.setUint8(13, 'm'.charCodeAt());
				header.setUint8(14, 't'.charCodeAt());
				header.setUint8(15, ' '.charCodeAt());
				header.setUint32(16, 16, true);																		// fmt chunk size
				header.setUint16(20, 1, true);																		// pcm
				header.setUint16(22, this.audioIn.numChannels, true);												// mono
				header.setUint32(24, this.audioIn.sampleRate, true);												// sample rate
				header.setUint32(28, this.audioIn.sampleRate * this.audioIn.numChannels * (this.audioIn.bitsPerSample >> 3), true);		// byte rate: SampleRate * NumChannels * BitsPerSample/8
				header.setUint16(32, (1 * this.audioIn.bitsPerSample) >> 3, true);									// block align: NumChannels * BitsPerSample/8
				header.setUint16(34, this.audioIn.bitsPerSample, true);												// bits per sample
				header.setUint8(36, 'd'.charCodeAt());
				header.setUint8(37, 'a'.charCodeAt());
				header.setUint8(38, 't'.charCodeAt());
				header.setUint8(39, 'a'.charCodeAt());
				header.setUint32(40, this.samplesRemaining * this.audioIn.numChannels * (this.audioIn.bitsPerSample >> 3), true);

				this.sentWavHeader = true;
				return header.buffer;
			}

			if (!this.samplesRemaining)
				return;

			value = Math.min(value, 1400);
			let samplesToRead = Math.min(this.samplesRemaining, value / (this.audioIn.numChannels * (this.audioIn.bitsPerSample >> 3)))
			this.samplesRemaining -= samplesToRead;
			trace(`${this.samplesRemaining} samplesRemaining\n`);
			return this.audioIn.read(samplesToRead);
		}
		else if ((message < 0) || (10 === message)) {
			trace(`CLOSE\n`);
			if (this.audioIn)
				this.audioIn.close();
		}
	}
}

export default function () {
	new WavServer({});
}


/*
	let input = new AudioIn;

	const sampleCount = 2048;

	while (true) {
		let samples = new Int16Array(input.read(sampleCount));

		let total = 0;
		for (let i = 0; i < sampleCount; i++) {
			const sample = samples[i];
			if (sample < 0)
				total -= sample;
			else
				total += sample;
		}

		trace(`Average ${(total / sampleCount) | 0}\n`);
	}
*/
