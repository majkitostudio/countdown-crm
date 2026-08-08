/**
 * Native WebAudio API Engine & Real-Time PCM Streamer
 * Manages echo cancellation, noise suppression, gain nodes, live volume metering
 * and 16kHz PCM audio buffer extraction for Gemini AI live analysis.
 */

export interface AudioEngineConfig {
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export type AudioChunkCallback = (pcmData: Float32Array, sampleRate: number) => void;

export class TelephonyAudioEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  private isMuted: boolean = false;
  private isRecording: boolean = false;
  private onAudioChunkCallbacks: Set<AudioChunkCallback> = new Set();

  constructor(private config: AudioEngineConfig = {}) {
    this.config = {
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config,
    };
  }

  /**
   * Initializes browser microphone media stream and WebAudio pipeline
   */
  public async initialize(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });

      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.config.sampleRate || 16000 });

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.gainNode = this.audioCtx.createGain();
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;

      // Connect WebAudio graph: Source -> Gain -> Analyser
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);

      // ScriptProcessor for extracting raw PCM chunks (2048 buffer size)
      this.scriptProcessor = this.audioCtx.createScriptProcessor(2048, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRecording || this.isMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmCopy = new Float32Array(inputData.length);
        pcmCopy.set(inputData);

        this.onAudioChunkCallbacks.forEach((cb) => cb(pcmCopy, this.audioCtx?.sampleRate || 16000));
      };

      this.analyserNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioCtx.destination);

      return true;
    } catch (err) {
      console.warn("[TelephonyAudioEngine] Microphone access failed or denied:", err);
      return false;
    }
  }

  public startRecording() {
    this.isRecording = true;
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  public stopRecording() {
    this.isRecording = false;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : 1;
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * Returns normalized RMS volume level [0.0 - 1.0] for live waveform rendering
   */
  public getVolumeLevel(): number {
    if (!this.analyserNode || this.isMuted) return 0;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    return Math.min(1.0, average / 128.0);
  }

  public subscribeAudioChunk(cb: AudioChunkCallback) {
    this.onAudioChunkCallbacks.add(cb);
  }

  public unsubscribeAudioChunk(cb: AudioChunkCallback) {
    this.onAudioChunkCallbacks.delete(cb);
  }

  public destroy() {
    this.stopRecording();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    this.onAudioChunkCallbacks.clear();
  }
}

export const audioEngine = new TelephonyAudioEngine();
