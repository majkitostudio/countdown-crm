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
      this.release();

      if (!navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });

      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error("Web Audio API is unavailable");
      }
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
      this.release();
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

  /**
   * Releases the microphone and WebAudio graph for the current local call.
   * Callbacks remain registered so a later call can reuse the engine.
   */
  public release() {
    this.stopRecording();

    try {
      this.sourceNode?.disconnect();
      this.gainNode?.disconnect();
      this.analyserNode?.disconnect();
      this.scriptProcessor?.disconnect();
    } catch {
      // Browser implementations may already have disconnected a node.
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.onaudioprocess = null;
    }

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      void this.audioCtx.close();
    }

    this.mediaStream = null;
    this.audioCtx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.scriptProcessor = null;
    this.isMuted = false;
  }

  public destroy() {
    this.release();
    this.onAudioChunkCallbacks.clear();
  }
}

export const audioEngine = new TelephonyAudioEngine();
