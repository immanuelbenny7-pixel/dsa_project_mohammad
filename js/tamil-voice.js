/**
 * tamil-voice.js - Tamil Voice Interaction Engine
 * Features:
 *  - Web Speech API (speechSynthesis) with Tamil (ta-IN / ta) voice selection
 *  - Interactive Tamil Customer & Attendant dialogues
 *  - Floating animated glassmorphism speech bubble with Tamil script, phonetic English & translation
 *  - Procedural speech chime accompaniment
 *  - Full toggle controls (Button in HUD & Key shortcut [T])
 */

class TamilVoiceSystem {
  constructor() {
    this.enabled = true;
    this.voices = [];
    this.currentUtterance = null;
    this.bubbleTimeout = null;
    this.speechAvailable = ('speechSynthesis' in window);

    this.bubbleEl = null;
    this.avatarEl = null;
    this.speakerEl = null;
    this.textEl = null;
    this.phoneticEl = null;
    this.transEl = null;
    this.toggleBtn = null;

    this.initVoices();
  }

  init() {
    this.bubbleEl = document.getElementById('tamil-speech-bubble');
    this.avatarEl = document.getElementById('tamil-avatar');
    this.speakerEl = document.getElementById('tamil-speaker');
    this.textEl = document.getElementById('tamil-text');
    this.phoneticEl = document.getElementById('tamil-phonetic');
    this.transEl = document.getElementById('tamil-translation');
    this.toggleBtn = document.getElementById('btn-toggle-tamil');

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.toggleVoice();
      });
    }

    // Keyboard shortcut [T] to toggle Tamil voice
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 't' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
        this.toggleVoice();
      }
    });

    this.updateToggleButton();
  }

  initVoices() {
    if (!this.speechAvailable) return;
    const updateVoices = () => {
      this.voices = window.speechSynthesis.getVoices() || [];
    };
    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  getBestTamilVoice() {
    if (!this.voices.length && this.speechAvailable) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }

    // 1. Exact Tamil voice (ta-IN, ta)
    const exact = this.voices.find(v => v.lang === 'ta-IN' || v.lang === 'ta' || v.lang.startsWith('ta-') || v.name.toLowerCase().includes('tamil') || v.name.toLowerCase().includes('valluvar'));
    if (exact) return exact;

    // 2. Indian regional or Indian English voice fallback
    const inVoice = this.voices.find(v => v.lang === 'en-IN' || v.lang === 'hi-IN' || v.lang.includes('IN') || v.name.toLowerCase().includes('india'));
    if (inVoice) return inVoice;

    // 3. Default voice
    return this.voices.find(v => v.default) || this.voices[0] || null;
  }

  toggleVoice() {
    this.enabled = !this.enabled;
    this.updateToggleButton();
    if (window.pumpShiftGame) {
      window.pumpShiftGame.showToast(
        this.enabled ? '🗣️ தமிழ் குரல் இயக்கப்பட்டது (Tamil Voice: ON) [T]' : '🔇 தமிழ் குரல் நிறுத்தப்பட்டது (Tamil Voice: OFF) [T]',
        'info'
      );
    }
    if (!this.enabled && this.speechAvailable) {
      window.speechSynthesis.cancel();
      this.hideBubble();
    }
  }

  updateToggleButton() {
    if (!this.toggleBtn) return;
    if (this.enabled) {
      this.toggleBtn.innerHTML = '🗣️ தமிழ்: ON [T]';
      this.toggleBtn.classList.add('active');
    } else {
      this.toggleBtn.innerHTML = '🔇 தமிழ்: OFF [T]';
      this.toggleBtn.classList.remove('active');
    }
  }

  /**
   * Play dialogue with both audible TTS and visual speech bubble
   */
  speak(dialogue) {
    if (!this.enabled) return;
    if (!dialogue) return;

    // 1. Play light procedural dialogue chime blip
    this.playSpeechChime(dialogue.speakerType || 'customer');

    // 2. Display visual Tamil Speech Bubble
    this.showBubble(dialogue);

    // 3. Web Speech API Speech Synthesis
    if (this.speechAvailable && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop prior sentence

        // If the voice is a native Tamil voice, speak the authentic Tamil text.
        // If it's a non-Tamil fallback voice, speak phonetic text so the pronunciation sounds Indian/Tamil!
        const voice = this.getBestTamilVoice();
        const isNativeTamil = voice && (voice.lang.startsWith('ta') || voice.name.toLowerCase().includes('tamil'));
        const spokenText = isNativeTamil ? dialogue.tamil : (dialogue.phonetic || dialogue.tamil);

        const utterance = new SpeechSynthesisUtterance(spokenText);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || 'ta-IN';
        } else {
          utterance.lang = 'ta-IN';
        }

        utterance.rate = dialogue.rate || 0.95;
        utterance.pitch = dialogue.pitch || 1.05;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis error:', err);
      }
    }
  }

  showBubble(d) {
    if (!this.bubbleEl) this.init();
    if (!this.bubbleEl) return;

    if (this.avatarEl) this.avatarEl.textContent = d.avatar || '🚗';
    if (this.speakerEl) this.speakerEl.textContent = d.speaker || 'CUSTOMER (வாடிக்கையாளர்)';
    if (this.textEl) this.textEl.textContent = d.tamil || '';
    if (this.phoneticEl) this.phoneticEl.textContent = d.phonetic ? `"${d.phonetic}"` : '';
    if (this.transEl) this.transEl.textContent = d.translation ? `(${d.translation})` : '';

    this.bubbleEl.classList.remove('hidden', 'fade-out');
    this.bubbleEl.classList.add('visible');

    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
      this.hideBubble();
    }, 4500);
  }

  hideBubble() {
    if (!this.bubbleEl) return;
    this.bubbleEl.classList.add('fade-out');
    setTimeout(() => {
      this.bubbleEl.classList.remove('visible', 'fade-out');
      this.bubbleEl.classList.add('hidden');
    }, 300);
  }

  /**
   * Synthesize a cute pleasant speech blip using Web Audio API
   */
  playSpeechChime(speakerType) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = window.soundEngine ? window.soundEngine.ctx : new AudioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      if (speakerType === 'attendant') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
      } else if (speakerType === 'angry') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
      }

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      // Audio blip optional
    }
  }

  // ============================================================
  // CONTEXTUAL TAMIL DIALOGUE GENERATORS
  // ============================================================

  onShiftStart() {
    this.speak({
      speaker: 'ATTENDANT (பணியாளர்)',
      speakerType: 'attendant',
      avatar: '👷',
      tamil: 'வணக்கம்! இன்னைக்கு டியூட்டி ஆரம்பம்! வாங்க, முதல் வண்டி வருது!',
      phonetic: 'Vanakkam! Innaiku duty aarambam! Vaanga, mudhal vandi varudhu!',
      translation: 'Welcome! Today shift begins! Come on, first car is arriving!',
      pitch: 1.05
    });
  }

  onCarArriveAtPump(car, order) {
    const litres = order.targetLitres.toFixed(1);
    const fuel = order.fuelType;

    if (order.targetLitres >= 35.0) {
      this.speak({
        speaker: `CUSTOMER (${car.id})`,
        speakerType: 'customer',
        avatar: '🛻',
        tamil: 'தம்பி, டேங்க் ஃபுல் பண்ணி விட்டுடுங்க! அவசரமா போகணும்!',
        phonetic: 'Thambi, tank full panni vittudunga! Avasaramaa poganum!',
        translation: 'Brother, fill the full tank! I need to head out soon!',
        pitch: 1.0
      });
      return;
    }

    if (fuel === 'diesel') {
      this.speak({
        speaker: `CUSTOMER (${car.id})`,
        speakerType: 'customer',
        avatar: '🚙',
        tamil: `அண்ணா, டீசல் ${litres} லிட்டர் போடுங்க சீக்கிரம்!`,
        phonetic: `Anna, Diesel ${litres} litre podunga seekiram!`,
        translation: `Brother, fill ${litres} litres Diesel quickly!`,
        pitch: 0.95
      });
    } else if (fuel === 'premium') {
      this.speak({
        speaker: `CUSTOMER (${car.id})`,
        speakerType: 'customer',
        avatar: '🏎️',
        tamil: `ஹலோ பாஸ்! பிரீமியம் பெட்ரோல் ${litres} லிட்டர் போடுங்க!`,
        phonetic: `Hello boss! Premium petrol ${litres} litre podunga!`,
        translation: `Hello boss! Put ${litres} litres Premium petrol!`,
        pitch: 1.1
      });
    } else {
      this.speak({
        speaker: `CUSTOMER (${car.id})`,
        speakerType: 'customer',
        avatar: '🚗',
        tamil: `வணக்கம்! ரெகுலர் பெட்ரோல் ${litres} லிட்டர் போடுங்க தம்பி!`,
        phonetic: `Vanakkam! Regular petrol ${litres} litre podunga thambi!`,
        translation: `Hello! Put ${litres} litres Regular petrol brother!`,
        pitch: 1.05
      });
    }
  }

  onNozzleConnected(car) {
    this.speak({
      speaker: 'ATTENDANT (பணியாளர்)',
      speakerType: 'attendant',
      avatar: '🔌',
      tamil: 'சரிங்க சார்! மீட்டர் ஜீரோ பார்த்துக்கோங்க, போடுறேன்!',
      phonetic: 'Saringa sir! Meter zero paathukonga, podren!',
      translation: 'Sure sir! Check meter is zero, dispensing now!',
      pitch: 1.05
    });
  }

  onPumpingTargetReached(litres, cost) {
    this.speak({
      speaker: 'ATTENDANT (பணியாளர்)',
      speakerType: 'attendant',
      avatar: '⛽',
      tamil: `முடிஞ்சதுங்க! கரெக்ட்டா ${litres.toFixed(1)} லிட்டர்! பில்லு ₹${cost} ஆச்சுங்க!`,
      phonetic: `Mudinjadhunga! Correct-aa ${litres.toFixed(1)} litre! Bill-u ₹${cost} aachunga!`,
      translation: `Done! Exactly ${litres.toFixed(1)} litres! Total bill is ₹${cost}!`,
      pitch: 1.05
    });
  }

  onWrongFuelWarning(requested, selected) {
    this.speak({
      speaker: 'CUSTOMER (கோபமான வாடிக்கையாளர்)',
      speakerType: 'angry',
      avatar: '😠',
      tamil: `யோவ் தம்பி! என்ன தப்பான பெட்ரோல் போடுறீங்க?! நான் கேட்டது ${requested.toUpperCase()}!`,
      phonetic: `Yov thambi! Enna thappaana petrol podreenga?! Naan kettadhu ${requested.toUpperCase()}!`,
      translation: `Hey brother! Why are you putting wrong fuel?! I asked for ${requested.toUpperCase()}!`,
      pitch: 0.9,
      rate: 1.05
    });
  }

  onPaymentCollected(car, cost) {
    const responses = [
      {
        tamil: 'ரொம்ப நன்றி தம்பி! சூப்பர் சர்வீஸ், வரேன்!',
        phonetic: 'Romba nandri thambi! Super service, varen!',
        translation: 'Thanks a lot brother! Super service, see you!'
      },
      {
        tamil: `இந்தாங்க பணம் ₹${cost}! மீதி வச்சுக்கோங்க, வரேன்!`,
        phonetic: `Indhaanga panam ₹${cost}! Meedhi vachukonga, varen!`,
        translation: `Here is the money ₹${cost}! Keep the change, bye!`
      },
      {
        tamil: 'நல்லா போட்டீங்க தம்பி! கிளம்புறேன், நன்றி!',
        phonetic: 'Nallaa poteenga thambi! Kelamburen, nandri!',
        translation: 'Filled nicely brother! Heading out, thanks!'
      }
    ];

    const pick = responses[Math.floor(Math.random() * responses.length)];
    this.speak({
      speaker: `CUSTOMER (${car.id})`,
      speakerType: 'customer',
      avatar: '😊',
      tamil: pick.tamil,
      phonetic: pick.phonetic,
      translation: pick.translation,
      pitch: 1.05
    });
  }

  onCustomerWalkout(car) {
    this.speak({
      speaker: `ANGRY CUSTOMER (${car.id})`,
      speakerType: 'angry',
      avatar: '😡',
      tamil: 'என்னப்பா இவ்வளவு லேட்?! எனக்கு அவசரமான வேலை இருக்கு, நான் போறேன்!',
      phonetic: 'Ennappa ivvalavu late?! Enakku avasaramaana velai irukku, naan poren!',
      translation: 'Why taking so long?! I have urgent work, I am leaving!',
      pitch: 0.92,
      rate: 1.1
    });
  }

  onUndoSale(tx) {
    this.speak({
      speaker: 'ATTENDANT (பணியாளர்)',
      speakerType: 'attendant',
      avatar: '↩️',
      tamil: 'மன்னிச்சுக்கோங்க சார்! பில் கேன்சல் பண்ணி பணம் திருப்பி தந்துட்டேன்!',
      phonetic: 'Mannichukonga sir! Bill cancel panni panam thiruppi thandhuten!',
      translation: 'Sorry sir! Bill cancelled and money refunded!',
      pitch: 1.0
    });
  }

  onFinishPointReached() {
    this.speak({
      speaker: 'STATION MANAGER (மேலாளர்)',
      speakerType: 'manager',
      avatar: '🏁',
      tamil: 'அருமை! 10 கார்கள் முடிந்தது! கடைக்குள் இருக்கும் கம்ப்யூட்டரில் மொத்த வசூலைக் கணக்கிடுங்கள்!',
      phonetic: 'Arumai! 10 kaargal mudindhadhu! Kadaikul irukkum computer-il motha vasoolai kanakidungal!',
      translation: 'Awesome! 10 cars completed! Calculate the total shift collection on the shop computer!',
      pitch: 1.15,
      rate: 1.05
    });
  }

  onShiftEnd(cash) {
    this.speak({
      speaker: 'ATTENDANT (பணியாளர்)',
      speakerType: 'attendant',
      avatar: '🎉',
      tamil: `அப்பாடா! இன்னைக்கு ஷிப்ட் வெற்றிகரமா முடிஞ்சது! கலெக்ஷன் ₹${cash.toFixed(2)}!`,
      phonetic: `Appada! Innaiku shift vetrigarama mudinjadhu! Collection ₹${cash.toFixed(2)}!`,
      translation: `Phew! Today shift completed successfully! Collection ₹${cash.toFixed(2)}!`,
      pitch: 1.1
    });
  }
}

// Global instance
window.tamilVoice = new TamilVoiceSystem();
window.addEventListener('DOMContentLoaded', () => {
  if (window.tamilVoice) window.tamilVoice.init();
});
