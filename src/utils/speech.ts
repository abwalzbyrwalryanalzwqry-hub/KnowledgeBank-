/**
 * Web Speech API text-to-speech engine for Arabic question readout.
 * Provides accessible audio narration for questions and explanations.
 */

class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private arabicVoice: SpeechSynthesisVoice | null = null;
  private isAvailable: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isAvailable = true;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer Arabic voices (ar-SA, ar-EG, ar, etc.)
    this.arabicVoice = voices.find((v) => v.lang.startsWith('ar')) || null;
  }

  /** متاح فقط إن وُجد محرك نطق (WebView في Android لا يوفّره غالبًا). */
  public get supported(): boolean {
    return this.isAvailable;
  }

  public speak(text: string, onEnd?: () => void) {
    if (!this.synth || !this.isAvailable) {
      onEnd?.();
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.arabicVoice) {
      utterance.voice = this.arabicVoice;
    }
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    try {
      this.synth.speak(utterance);
    } catch {}
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }
}

export const speech = new SpeechEngine();
