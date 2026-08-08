import { audioEngine } from "./audioEngine";
import { analyzeTranscriptWithGemini, CopilotAnalysisResult } from "../gemini";

export interface LiveAudioAiEvent {
  transcriptSnippet: string;
  sentiment: "Positive" | "Neutral" | "Negative" | "Urgent";
  detectedObjection?: string;
  suggestedRebuttal?: string;
  complianceWarning?: string;
}

export type LiveAudioAiListener = (event: LiveAudioAiEvent) => void;

export class RealTimeAiAudioStreamerBridge {
  private isStreaming: boolean = false;
  private audioBuffer: number[] = [];
  private listeners: Set<LiveAudioAiListener> = new Set();
  private processInterval: NodeJS.Timeout | null = null;
  private simulatedUtterancesIndex = 0;

  private mockLivePhrases: LiveAudioAiEvent[] = [
    {
      transcriptSnippet: "Dobrý den, volám ohledně vaší poptávky na Bio-Boost balíček.",
      sentiment: "Positive",
    },
    {
      transcriptSnippet: "Zákazník: Ta cena se mi zdá docela vysoká v porovnání s lékárnou.",
      sentiment: "Negative",
      detectedObjection: "Price is too high compared to standard pharmacy vitamins",
      suggestedRebuttal: "Zdůrazněte farmaceutickou liposomální vstřebatelnost (až 800 % vyšší) a nabídněte 15% VIP slevu.",
    },
    {
      transcriptSnippet: "Operátor: Rozumím, naše liposomální forma má 800% vstřebatelnost a máme 30denní záruku.",
      sentiment: "Positive",
    },
    {
      transcriptSnippet: "Zákazník: Aha, to zní zajímavě. Je k tomu i doprava zdarma?",
      sentiment: "Positive",
    },
    {
      transcriptSnippet: "Zákazník: Dobrá, vezmu si ten 3měsíční balíček se slevou.",
      sentiment: "Positive",
    },
  ];

  constructor() {
    this.handleAudioChunk = this.handleAudioChunk.bind(this);
  }

  public subscribe(listener: LiveAudioAiListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public startStreaming() {
    if (this.isStreaming) return;
    this.isStreaming = true;
    this.simulatedUtterancesIndex = 0;
    audioEngine.subscribeAudioChunk(this.handleAudioChunk);

    // Periodically process audio buffer / simulate live AI speech-to-text chunks every 4.5s
    this.processInterval = setInterval(() => {
      if (!this.isStreaming) return;
      this.processAccumulatedAudio();
    }, 4500);
  }

  public stopStreaming() {
    this.isStreaming = false;
    audioEngine.unsubscribeAudioChunk(this.handleAudioChunk);
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.audioBuffer = [];
  }

  private handleAudioChunk(pcmData: Float32Array) {
    for (let i = 0; i < pcmData.length; i += 8) {
      this.audioBuffer.push(pcmData[i]);
    }
  }

  private async processAccumulatedAudio() {
    if (this.simulatedUtterancesIndex < this.mockLivePhrases.length) {
      const eventPayload = this.mockLivePhrases[this.simulatedUtterancesIndex];
      this.simulatedUtterancesIndex = (this.simulatedUtterancesIndex + 1) % this.mockLivePhrases.length;
      
      this.listeners.forEach((fn) => fn(eventPayload));
    }
  }
}

export const aiStreamerBridge = new RealTimeAiAudioStreamerBridge();
