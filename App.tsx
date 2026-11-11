import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Check,
  X,
  Eye,
  SkipForward,
  RotateCcw,
  BookOpen,
  Sparkles,
  HelpCircle,
  Play,
  Languages,
  Trophy,
  ChevronRight,
  Flame,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { QUESTIONS_DATA, checkAnswer, PasapalabraQuestion } from './questions';
import { soundEffects, speakSpanish } from './sound';

export type LetterStatus = 'pending' | 'correct' | 'wrong' | 'viewed';

export default function App() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [statuses, setStatuses] = useState<Record<number, LetterStatus>>(() => {
    const initial: Record<number, LetterStatus> = {};
    QUESTIONS_DATA.forEach((q) => {
      initial[q.id] = 'pending';
    });
    return initial;
  });

  const [userInput, setUserInput] = useState<string>('');
  const [showArmenianTranslation, setShowArmenianTranslation] = useState<boolean>(false);
  const [alwaysShowTranslation, setAlwaysShowTranslation] = useState<boolean>(false);
  const [revealedAnswer, setRevealedAnswer] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'wrong' | 'revealed' | null;
    messageHy: string;
    messageEs: string;
    correctWord?: string;
    correctHy?: string;
  }>({
    type: null,
    messageHy: '',
    messageEs: '',
  });

  const [activeTab, setActiveTab] = useState<'game' | 'vocabulary'>('game');
  const [dictionaryFilter, setDictionaryFilter] = useState<'all' | 'correct' | 'wrong' | 'viewed' | 'pending'>('all');
  
  // Timer state
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(180);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const currentQ: PasapalabraQuestion = QUESTIONS_DATA[currentIndex];

  // Calculate statistics
  const totalQuestions = QUESTIONS_DATA.length;
  const correctCount = Object.values(statuses).filter((s) => s === 'correct').length;
  const wrongCount = Object.values(statuses).filter((s) => s === 'wrong').length;
  const viewedCount = Object.values(statuses).filter((s) => s === 'viewed').length;
  const pendingCount = Object.values(statuses).filter((s) => s === 'pending').length;
  const remainingCount = pendingCount + viewedCount;
  const isAllAnswered = correctCount + wrongCount === totalQuestions;
  const [hasManuallyFinished, setHasManuallyFinished] = useState<boolean>(false);
  const isGameOver = isAllAnswered || hasManuallyFinished;

  // Auto focus input on letter change
  useEffect(() => {
    if (activeTab === 'game' && !isGameOver) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [currentIndex, activeTab, isGameOver]);

  // Reset local state when moving to another question
  useEffect(() => {
    setUserInput('');
    setRevealedAnswer(false);
    setShowArmenianTranslation(alwaysShowTranslation);
    setFeedback({ type: null, messageHy: '', messageEs: '' });
  }, [currentIndex, alwaysShowTranslation]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && secondsLeft > 0 && !isGameOver) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, secondsLeft, isGameOver]);

  // Play victory sound on completion
  useEffect(() => {
    if (isGameOver && correctCount > 0) {
      if (soundEnabled) soundEffects.playVictory();
    }
  }, [isGameOver, correctCount, soundEnabled]);

  // Find next pending or unfinished question starting after a given index
  const getNextPendingIndex = (fromIndex: number): number => {
    // 1st pass: letters still purely 'pending'
    for (let i = 1; i <= totalQuestions; i++) {
      const idx = (fromIndex + i) % totalQuestions;
      const q = QUESTIONS_DATA[idx];
      if (statuses[q.id] === 'pending') {
        return idx;
      }
    }
    // 2nd pass: letters that were viewed/peeked but not yet marked 'correct' or 'wrong'
    for (let i = 1; i <= totalQuestions; i++) {
      const idx = (fromIndex + i) % totalQuestions;
      const q = QUESTIONS_DATA[idx];
      if (statuses[q.id] === 'viewed') {
        return idx;
      }
    }
    return fromIndex; // all completed
  };

  // Submit Answer - works anytime user types, including after viewing the answer!
  const handleAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const isCorrect = checkAnswer(userInput, currentQ);

    if (isCorrect) {
      if (soundEnabled) soundEffects.playCorrect();
      setStatuses((prev) => ({ ...prev, [currentQ.id]: 'correct' }));
      setFeedback({
        type: 'correct',
        messageHy: `¡Ճիշտ է! «${currentQ.wordEs}» պատասխանը ճիշտ է:`,
        messageEs: `¡Correcto! Excelente respuesta: "${currentQ.wordEs}".`,
        correctWord: currentQ.wordEs,
        correctHy: currentQ.wordHy,
      });

      // Advance after a brief moment
      setTimeout(() => {
        const nextIdx = getNextPendingIndex(currentIndex);
        setCurrentIndex(nextIdx);
      }, 1200);
    } else {
      // User requested: "если ответ неверный всё равно продолжить играть"
      if (soundEnabled) soundEffects.playWrong();
      setStatuses((prev) => ({ ...prev, [currentQ.id]: 'wrong' }));
      setFeedback({
        type: 'wrong',
        messageHy: `Ոչ ճիշտ։ Ճիշտ բառն է՝ "${currentQ.wordEs}" (${currentQ.wordHy})։ Խաղը շարունակվում է:`,
        messageEs: `Incorrecto. La palabra correcta era "${currentQ.wordEs}". ¡El juego continúa!`,
        correctWord: currentQ.wordEs,
        correctHy: currentQ.wordHy,
      });

      // Auto continue to next after showing feedback, or user can click next
      setTimeout(() => {
        const nextIdx = getNextPendingIndex(currentIndex);
        setCurrentIndex(nextIdx);
      }, 1800);
    }
  };

  // Pasapalabra (Pass current question for later)
  const handlePasapalabra = () => {
    if (soundEnabled) soundEffects.playPass();
    const nextIdx = getNextPendingIndex(currentIndex);
    setCurrentIndex(nextIdx);
  };

  // View Answer without penalty
  // User prompt: "и отдельно пусть будет кнопка поссмотеть ответ но после просмотра ответа усть не будет сосчитан ответ неверным а посто посмотреть ответ"
  const handlePeekAnswer = () => {
    if (soundEnabled) soundEffects.playReveal();
    setRevealedAnswer(true);
    setShowArmenianTranslation(true);

    // If it was still pending, mark as 'viewed' (NOT 'wrong'!)
    if (statuses[currentQ.id] === 'pending') {
      setStatuses((prev) => ({ ...prev, [currentQ.id]: 'viewed' }));
    }

    setFeedback({
      type: 'revealed',
      messageHy: `Պատասխանը բացված է (սխալ չի համարվում)։ Կարող եք գրել այն («${currentQ.wordEs}») և սեղմել «Ստուգել»՝ խաղը շարունակելու համար։`,
      messageEs: `Respuesta consultada (no cuenta como fallo). Puedes escribirla abajo y pulsar "Ստուգել" (Comprobar) para continuar:`,
      correctWord: currentQ.wordEs,
      correctHy: currentQ.wordHy,
    });

    // Automatically focus the input field so user can type immediately!
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Move to next question manually
  const handleManualNext = () => {
    const nextIdx = getNextPendingIndex(currentIndex);
    setCurrentIndex(nextIdx);
  };

  // Insert Spanish accent or symbol into input field
  const handleInsertChar = (char: string) => {
    setUserInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  // Restart game
  const handleRestartGame = () => {
    const initial: Record<number, LetterStatus> = {};
    QUESTIONS_DATA.forEach((q) => {
      initial[q.id] = 'pending';
    });
    setStatuses(initial);
    setCurrentIndex(0);
    setUserInput('');
    setRevealedAnswer(false);
    setHasManuallyFinished(false);
    setFeedback({ type: null, messageHy: '', messageEs: '' });
    setSecondsLeft(180);
  };

  // Calculate coordinates for the 27 letters in circular ring
  // Diameter 380px (radius 165px) inside a 400x400 container
  const radius = 162;
  const centerX = 195;
  const centerY = 195;

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-blue-950 to-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Bar */}
      <header className="border-b border-blue-900/40 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-blue-500/30">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Pasapalabra
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Հայերեն · Իսպաներեն
                  </span>
                </h1>
              </div>
              <p className="text-xs text-blue-300/70 hidden sm:block">
                Առօրյա շփում և ֆուտբոլային բառապաշար (El Rosco)
              </p>
            </div>
          </div>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* View switcher */}
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-blue-900/40">
              <button
                onClick={() => setActiveTab('game')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'game'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Խաղ (Rosco)</span>
              </button>
              <button
                onClick={() => setActiveTab('vocabulary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'vocabulary'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Բառապաշար (27)</span>
              </button>
            </div>

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Ձայնը միացված է' : 'Ձայնն անջատված է'}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'bg-blue-950/60 border-blue-800 text-blue-400 hover:bg-blue-900/50'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Restart button */}
            <button
              onClick={handleRestartGame}
              title="Վերսկսել խաղը"
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {activeTab === 'game' ? (
          <div>
            {/* TV Show Status Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mb-6">
              {/* Correct score */}
              <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between shadow-lg shadow-emerald-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                      Ճիշտ (Aciertos)
                    </div>
                    <div className="text-xs text-emerald-200/70">միավոր</div>
                  </div>
                </div>
                <span className="text-2xl font-black text-emerald-400 tabular-nums">
                  {correctCount}
                </span>
              </div>

              {/* Wrong score */}
              <div className="bg-rose-950/50 border border-rose-500/30 rounded-2xl p-3 flex items-center justify-between shadow-lg shadow-rose-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-white">
                    <X className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                      Սխալ (Fallos)
                    </div>
                    <div className="text-xs text-rose-200/70">չի կանգնեցնում</div>
                  </div>
                </div>
                <span className="text-2xl font-black text-rose-400 tabular-nums">
                  {wrongCount}
                </span>
              </div>

              {/* Viewed / Peeked score (Separated, not counted as error!) */}
              <div className="bg-amber-950/50 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between shadow-lg shadow-amber-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">
                      Դիտված (Vistos)
                    </div>
                    <div className="text-xs text-amber-200/70">չի տուգանվում</div>
                  </div>
                </div>
                <span className="text-2xl font-black text-amber-400 tabular-nums">
                  {viewedCount}
                </span>
              </div>

              {/* Remaining letters */}
              <div className="bg-blue-950/50 border border-blue-500/30 rounded-2xl p-3 flex items-center justify-between shadow-lg shadow-blue-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">
                      Մնացած
                    </div>
                    <div className="text-xs text-blue-200/70">տառեր</div>
                  </div>
                </div>
                <span className="text-2xl font-black text-blue-300 tabular-nums">
                  {remainingCount}
                </span>
              </div>
            </div>

            {/* Game Arena: Split or Centered Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center max-w-6xl mx-auto">
              {/* Left Column / Mobile Top: El Rosco Wheel */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] flex items-center justify-center">
                  {/* Subtle decorative inner glow & ring */}
                  <div className="absolute inset-8 rounded-full border border-blue-500/20 bg-radial from-blue-900/20 via-blue-950/10 to-transparent pointer-events-none" />
                  <div className="absolute inset-16 rounded-full border border-blue-400/10 pointer-events-none" />

                  {/* Center Circle Content in Rosco */}
                  <div className="z-10 flex flex-col items-center justify-center text-center p-4">
                    <div className="relative mb-1">
                      <div className="text-4xl sm:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-sky-200 to-blue-400 drop-shadow-md">
                        {currentQ.letter}
                      </div>
                      <div className="text-[11px] font-bold text-sky-400 tracking-wide uppercase mt-0.5">
                        {currentQ.ruleType === 'starts'
                          ? `Empieza por ${currentQ.letter}`
                          : `Contiene la ${currentQ.letter}`}
                      </div>
                      <div className="text-[10px] text-blue-300/80">
                        {currentQ.ruleType === 'starts'
                          ? `Սկսվում է ${currentQ.letter}-ով`
                          : `Պարունակում է ${currentQ.letter}`}
                      </div>
                    </div>

                    {/* Pronounce active letter button */}
                    <button
                      onClick={() => speakSpanish(currentQ.letter)}
                      className="mt-2 text-xs flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 hover:text-white hover:bg-blue-800/50 transition-colors"
                      title="Լսել տառի արտասանությունը"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{currentQ.letter} հնչյուն</span>
                    </button>
                  </div>

                  {/* 27 Circular Letter Badges placed along circle */}
                  {QUESTIONS_DATA.map((q, idx) => {
                    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / totalQuestions;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    const status = statuses[q.id];
                    const isCurrent = idx === currentIndex;

                    let bgClass = 'bg-blue-700 border-blue-400/60 text-white shadow-blue-900/50';
                    let icon = null;

                    if (status === 'correct') {
                      bgClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-900/60';
                      icon = <Check className="w-2.5 h-2.5 stroke-[3] -mr-0.5" />;
                    } else if (status === 'wrong') {
                      bgClass = 'bg-rose-600 border-rose-300 text-white shadow-rose-900/60';
                      icon = <X className="w-2.5 h-2.5 stroke-[3] -mr-0.5" />;
                    } else if (status === 'viewed') {
                      bgClass = 'bg-amber-600 border-amber-300 text-white shadow-amber-900/60';
                      icon = <Eye className="w-2.5 h-2.5 -mr-0.5" />;
                    } else if (isCurrent) {
                      bgClass = 'bg-sky-500 border-white text-white rosco-current-letter';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`Տառ ${q.letter} - ${
                          status === 'correct'
                            ? 'Ճիշտ'
                            : status === 'wrong'
                            ? 'Սխալ'
                            : status === 'viewed'
                            ? 'Դիտված'
                            : 'Սպասում է'
                        } (Սեղմեք անցնելու համար)`}
                        className={`absolute w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black border-2 transition-transform duration-200 shadow-md hover:scale-125 focus:outline-none focus:ring-2 focus:ring-sky-400 ${bgClass}`}
                      >
                        <span>{q.letter}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subtitle / Tip below Rosco */}
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  💡 Կարող եք սեղմել ցանկացած տառի վրա՝ անմիջապես այդ հարցին անցնելու համար
                </p>
              </div>

              {/* Right Column: Question, Answer Input & Action Buttons */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                {isGameOver ? (
                  /* Game Finished Victory Screen */
                  <div className="bg-slate-900/90 border border-blue-700/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-md">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-xl shadow-amber-500/30">
                      <Trophy className="w-9 h-9" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                      Շնորհավորո՛ւմ ենք: ¡Enhorabuena!
                    </h2>
                    <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
                      Դուք անցաք բոլոր 27 տառերով: Ահա ձեր արդյունքը.
                    </p>

                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
                      <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40">
                        <div className="text-3xl font-black text-emerald-400">{correctCount}</div>
                        <div className="text-xs text-emerald-300 mt-1 font-medium">Ճիշտ</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40">
                        <div className="text-3xl font-black text-rose-400">{wrongCount}</div>
                        <div className="text-xs text-rose-300 mt-1 font-medium">Սխալ</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/40">
                        <div className="text-3xl font-black text-amber-400">{viewedCount}</div>
                        <div className="text-xs text-amber-300 mt-1 font-medium">Դիտված</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={handleRestartGame}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/40 transition-all flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Խաղալ նորից</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('vocabulary')}
                        className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Վերանայել բոլոր 27 բառերը</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Notice if all pending letters have been visited */}
                    {pendingCount === 0 && (
                      <div className="p-3 rounded-2xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-between gap-3 text-xs shadow-md">
                        <span className="text-blue-200">
                          ✨ Բոլոր 27 տառերն արդեն այցելվել են։ Կարող եք լրացնել դիտվածները կամ ամփոփել խաղը։
                        </span>
                        <button
                          onClick={() => setHasManuallyFinished(true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
                        >
                          Ամփոփել արդյունքը
                        </button>
                      </div>
                    )}

                    {/* Active Question Card */}
                    <div className="bg-slate-900/80 border border-blue-900/60 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md relative">
                      {/* Header of card: Letter indicator and Pronounce button */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/40">
                          {currentQ.letter}
                        </span>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                            {currentQ.ruleType === 'starts'
                              ? `Empieza por ${currentQ.letter}`
                              : `Contiene la ${currentQ.letter}`}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            ({currentQ.ruleType === 'starts' ? `Սկսվում է ${currentQ.letter}-ով` : `Պարունակում է ${currentQ.letter}`})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Audio speaker button for question */}
                        <button
                          onClick={() => speakSpanish(currentQ.clueEs)}
                          title="Լսել հարցի իսպաներեն արտասանությունը"
                          className="px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-300 hover:text-white hover:bg-blue-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden sm:inline">Լսել</span>
                        </button>

                        {/* Status badge if already answered/viewed */}
                        {statuses[currentQ.id] === 'correct' && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-semibold">
                            <Check className="w-3 h-3 stroke-[3]" /> Ճիշտ
                          </span>
                        )}
                        {statuses[currentQ.id] === 'wrong' && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 font-semibold">
                            <X className="w-3 h-3 stroke-[3]" /> Սխալ
                          </span>
                        )}
                        {statuses[currentQ.id] === 'viewed' && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold">
                            <Eye className="w-3 h-3" /> Դիտված
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Spanish Question / Definition (CLICKABLE to reveal Armenian translation!) */}
                    {/* Requirement: "и пусть при клике на исп откроется перевод на арм" */}
                    <div className="mb-4">
                      <div
                        onClick={() => setShowArmenianTranslation(!showArmenianTranslation)}
                        title="Սեղմեք հայերեն թարգմանությունը տեսնելու համար"
                        className="group cursor-pointer p-4 rounded-2xl bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/40 transition-all duration-200 relative"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                            {currentQ.clueEs}
                          </p>
                          <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2.5 py-1 rounded-full group-hover:bg-sky-900/80 transition-colors">
                            <Languages className="w-3.5 h-3.5" />
                            <span>{showArmenianTranslation ? 'Փակել' : 'Հայերեն'}</span>
                          </div>
                        </div>

                        <div className="mt-2 text-[11px] text-blue-300/70 flex items-center gap-1">
                          <span>👆 Սեղմեք այստեղ՝ հայերեն թարգմանությունը բացելու համար</span>
                        </div>
                      </div>

                      {/* Revealed Armenian Question Translation */}
                      {showArmenianTranslation && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200 animate-fadeIn">
                          <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>🇦🇲 Հայերեն թարգմանություն՝</span>
                          </div>
                          <p className="text-sm sm:text-base font-normal leading-relaxed text-amber-100/90">
                            {currentQ.clueHy}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Feedback Banner (if answered or revealed) */}
                    {/* Feedback Banner (if answered or revealed) */}
                    {feedback.type && (
                      <div
                        className={`p-3.5 rounded-2xl mb-4 border transition-all text-sm ${
                          feedback.type === 'correct'
                            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                            : feedback.type === 'wrong'
                            ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                            : 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between gap-2">
                          <span>{feedback.messageHy}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {feedback.correctWord && (
                              <button
                                type="button"
                                onClick={() => speakSpanish(feedback.correctWord!)}
                                className="text-xs px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-white flex items-center gap-1"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>Լսել</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleManualNext}
                              className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shadow-sm"
                            >
                              <span>Հաջորդը</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {feedback.correctWord && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-base">
                                ✅ {feedback.correctWord}
                              </span>
                              <span className="text-slate-300">— {feedback.correctHy}</span>
                            </div>
                            {/* Quick fill button to copy the word into input */}
                            <button
                              type="button"
                              onClick={() => {
                                setUserInput(feedback.correctWord!);
                                inputRef.current?.focus();
                              }}
                              className="text-[11px] px-2 py-0.5 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700/60 font-medium transition-colors"
                            >
                              Տեղադրել դաշտում
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* If Answer is Revealed or Status is done: Show example sentence & details */}
                    {(revealedAnswer || statuses[currentQ.id] !== 'pending') && (
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-blue-900/40 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                            Օրինակ նախադասություն (Ejemplo):
                          </div>
                          <button
                            type="button"
                            onClick={() => speakSpanish(currentQ.exampleEs)}
                            className="text-xs text-blue-300 hover:text-white flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Լսել նախադասությունը</span>
                          </button>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          "{currentQ.exampleEs}"
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                          — {currentQ.exampleHy}
                        </div>
                      </div>
                    )}

                    {/* Answer Input Form - ALWAYS interactive so user can type and submit anytime! */}
                    <form onSubmit={handleAnswerSubmit} className="space-y-3">
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder={
                            revealedAnswer || statuses[currentQ.id] === 'viewed'
                              ? `Գրեք «${currentQ.wordEs}» և սեղմեք Ստուգել...`
                              : currentQ.ruleType === 'starts'
                              ? `Մուտքագրեք բառը (${currentQ.letter} տառով)...`
                              : `Մուտքագրեք բառը (${currentQ.letter} պարունակող)...`
                          }
                          className="w-full px-4 py-3.5 bg-slate-950 border border-blue-800/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30 rounded-2xl text-white placeholder-slate-500 text-base font-medium outline-none transition-all pr-24"
                        />
                        <button
                          type="submit"
                          disabled={!userInput.trim()}
                          className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1"
                        >
                          <span>Ստուգել</span>
                        </button>
                      </div>

                      {/* Virtual Spanish Keys for accents & special characters */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 mr-1">Իսպաներեն տառեր՝</span>
                        {['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'].map((char) => (
                          <button
                            key={char}
                            type="button"
                            onClick={() => handleInsertChar(char)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-colors"
                          >
                            {char}
                          </button>
                        ))}
                      </div>

                      {/* Action Buttons: Pasapalabra & Dedicated "View Answer" (Peek without penalty) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800">
                        {/* 1. Pasapalabra (Skip and return later) */}
                        <button
                          type="button"
                          onClick={handlePasapalabra}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-950/70 hover:bg-blue-900 border border-blue-700/60 text-blue-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <SkipForward className="w-3.5 h-3.5 text-blue-400" />
                          <span>Pasapalabra (Բաց թողնել)</span>
                        </button>

                        {/* 2. DEDICATED VIEW ANSWER BUTTON (Peek answer without penalty) */}
                        {/* Requirement: "и отдельно пусть будет кнопка поссмотеть ответ но после просмотра ответа усть не будет сосчитан ответ неверным а посто посмотреть ответ" */}
                        <button
                          type="button"
                          onClick={handlePeekAnswer}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-amber-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          title="Տեսնել պատասխանը՝ առանց սխալի հաշվարկման"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Տեսնել պատասխանը</span>
                        </button>

                        {/* 3. Next letter button */}
                        <button
                          type="button"
                          onClick={handleManualNext}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>Հաջորդ տառը</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>

                    {/* Bottom Helper Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                          <input
                            type="checkbox"
                            checked={alwaysShowTranslation}
                            onChange={(e) => setAlwaysShowTranslation(e.target.checked)}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0"
                          />
                          <span>Միշտ ցուցադրել հայերեն թարգմանությունը</span>
                        </label>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Տառ {currentIndex + 1} / {totalQuestions}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        ) : (
          /* Full 27 Vocabulary List & Study Mode */
          <div className="space-y-6">
            {/* Header & Filter Controls */}
            <div className="bg-slate-900/80 border border-blue-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                  <span>Առօրյա շփման և ֆուտբոլի բառապաշար (27 բառ)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Սեղմեք ցանկացած բառի վրա՝ իսպաներեն արտասանությունը լսելու համար
                </p>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setDictionaryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dictionaryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Բոլորը ({totalQuestions})
                </button>
                <button
                  onClick={() => setDictionaryFilter('correct')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dictionaryFilter === 'correct'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Ճիշտ ({correctCount})
                </button>
                <button
                  onClick={() => setDictionaryFilter('wrong')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dictionaryFilter === 'wrong'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  Սխալ ({wrongCount})
                </button>
                <button
                  onClick={() => setDictionaryFilter('viewed')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dictionaryFilter === 'viewed'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  Դիտված ({viewedCount})
                </button>
              </div>
            </div>

            {/* Vocabulary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {QUESTIONS_DATA.filter((q) => {
                if (dictionaryFilter === 'correct') return statuses[q.id] === 'correct';
                if (dictionaryFilter === 'wrong') return statuses[q.id] === 'wrong';
                if (dictionaryFilter === 'viewed') return statuses[q.id] === 'viewed';
                if (dictionaryFilter === 'pending') return statuses[q.id] === 'pending';
                return true;
              }).map((q) => {
                const status = statuses[q.id];
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-blue-600/60 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Letter badge & status & pronunciation */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                            {q.letter}
                          </span>
                          <span className="text-[11px] font-bold text-sky-400 uppercase">
                            {q.ruleType === 'starts' ? `Empieza por ${q.letter}` : `Contiene ${q.letter}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {status === 'correct' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                              Ճիշտ
                            </span>
                          )}
                          {status === 'wrong' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                              Սխալ
                            </span>
                          )}
                          {status === 'viewed' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              Դիտված
                            </span>
                          )}
                          <button
                            onClick={() => speakSpanish(q.wordEs)}
                            title="Լսել բառի արտասանությունը"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Word and Armenian meaning */}
                      <div className="mb-2">
                        <div className="text-lg font-black text-white flex items-center gap-2">
                          <span>{q.wordEs}</span>
                          <span className="text-xs text-sky-300 font-normal">({q.wordHy})</span>
                        </div>
                      </div>

                      {/* Clue/Definition */}
                      <div className="text-xs text-slate-300 mb-2 leading-relaxed">
                        <span className="text-slate-400">Հարց՝</span> {q.clueEs}
                        <div className="text-[11px] text-amber-200/80 mt-0.5 font-normal">
                          {q.clueHy}
                        </div>
                      </div>

                      {/* Example sentence */}
                      <div className="pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Օրինակ՝</span>
                          <button
                            onClick={() => speakSpanish(q.exampleEs)}
                            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            Լսել
                          </button>
                        </div>
                        <div className="font-semibold text-white mt-0.5">"{q.exampleEs}"</div>
                        <div className="text-slate-400 text-[11px]">— {q.exampleHy}</div>
                      </div>
                    </div>

                    {/* Action to jump to this question in Rosco */}
                    <button
                      onClick={() => {
                        setCurrentIndex(q.id - 1);
                        setActiveTab('game');
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Խաղալ այս տառը Rosco-ում</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-900/40 bg-slate-950/90 py-3 px-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Pasapalabra իսպաներեն-հայերեն խաղ առօրյա և ֆուտբոլային բառապաշարով</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>27 տառեր (A - Z, Ñ)</span>
            <span>·</span>
            <span>Web Audio ձայնային էֆեկտներ</span>
            <span>·</span>
            <span>TTS իսպաներեն արտասանություն</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
