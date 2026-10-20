import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ModeSelector } from './components/ModeSelector';
import { EraJourneyMap } from './components/EraJourneyMap';
import { TowerAscension } from './components/TowerAscension';
import { BlitzPulse } from './components/BlitzPulse';
import { CortexDuel } from './components/CortexDuel';
import { ArenaQuestion } from './components/ArenaQuestion';
import { DailyQuestModal } from './components/DailyQuestModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { GameMode, Stage, Question, PlayerStats, GameSettings, LevelItem, ZaytounaWorld } from './types/game';
import { QUESTIONS_DATABASE, STAGES_DATA } from './data/questions';
import { ZAYTOUNA_WORLDS } from './data/zaytounaStages';
import { ZaytounaMap } from './components/ZaytounaMap';
import { LevelPlayArena } from './components/LevelPlayArena';
import {
  loadPlayerStats,
  savePlayerStats,
  loadGameSettings,
  saveGameSettings,
} from './utils/storage';
import { calculateRank, calculateStageStars } from './game/rules';
import { sound } from './utils/audio';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(loadPlayerStats);
  const [settings, setSettings] = useState<GameSettings>(loadGameSettings);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);

  // Active Zaytouna Stage & Level
  const [activeZaytounaStage, setActiveZaytounaStage] = useState<ZaytounaWorld | null>(null);
  const [activeZaytounaLevel, setActiveZaytounaLevel] = useState<LevelItem | null>(null);

  // Active Stage in Journey Mode (legacy/era map)
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [stageQuestions, setStageQuestions] = useState<Question[]>([]);
  const [stageQuestionIndex, setStageQuestionIndex] = useState(0);
  const [stageScore, setStageScore] = useState(0);
  const [stageCorrectCount, setStageCorrectCount] = useState(0);


  // Modals
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Game Over Modal state
  const [gameOverData, setGameOverData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    xpEarned: number;
    starsEarned?: number;
    coinsEarned?: number;
    isPerfect?: boolean;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    score: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    xpEarned: 0,
    coinsEarned: 0,
    isPerfect: false,
  });

  // Autostart parameter check for Ultra-mode compliance
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      // jump straight to Tower mode
      startTowerMode();
    }
  }, []);

  // Sync settings sound with audio engine
  useEffect(() => {
    sound.setMuted(!settings.soundEnabled);
    if (settings.ambientMusic) {
      sound.toggleAmbientMusic(true);
    }
  }, []);

  const updateStats = (updater: (prev: PlayerStats) => PlayerStats) => {
    setStats((prev) => {
      const next = updater(prev);
      const rank = calculateRank(next.xp);
      const updated = {
        ...next,
        level: rank.level,
        rankTitle: rank.title,
      };
      savePlayerStats(updated);
      return updated;
    });
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      saveGameSettings(next);
      return next;
    });
  };

  // Start Modes
  const handleSelectMode = (mode: GameMode) => {
    sound.playClick();
    if (mode === 'JOURNEY') {
      setActiveTab('stages');
      setCurrentMode(null);
      setActiveZaytounaLevel(null);
    } else if (mode === 'TOWER') {
      startTowerMode();
    } else if (mode === 'BLITZ') {
      startBlitzMode();
    } else if (mode === 'DUEL') {
      startDuelMode();
    }
  };

  // Launch a specific level in Zaytouna World Map
  const handleSelectZaytounaLevel = (level: LevelItem, stage: ZaytounaWorld) => {
    sound.playClick();
    setActiveZaytounaStage(stage);
    setActiveZaytounaLevel(level);
    setCurrentMode(null);
  };

  const handleZaytounaLevelComplete = (
    stars: number,
    score: number,
    rewards: { coins: number; xp: number; isPerfect: boolean }
  ) => {
    if (!activeZaytounaLevel || !activeZaytounaStage) return;

    const levelId = activeZaytounaLevel.id;

    updateStats((prev) => {
      const prevCompleted = prev.completedLevels || {};
      const prevLevelData = prevCompleted[levelId];
      const newStars = Math.max(stars, prevLevelData?.stars || 0);

      const badges = [...prev.badges];
      if (stars > 0 && !badges.includes('first_win')) badges.push('first_win');
      if (stars === 3 && !badges.includes('perfect_3_stars')) badges.push('perfect_3_stars');

      return {
        ...prev,
        coins: prev.coins + rewards.coins,
        xp: prev.xp + rewards.xp,
        totalGames: prev.totalGames + 1,
        totalCorrect: prev.totalCorrect + activeZaytounaLevel.questions.length,
        totalAnswered: prev.totalAnswered + activeZaytounaLevel.questions.length,
        completedLevels: {
          ...prevCompleted,
          [levelId]: { stars: newStars, score: Math.max(score, prevLevelData?.score || 0) },
        },
        badges,
      };
    });

    setGameOverData({
      isOpen: true,
      title: rewards.isPerfect ? 'إتقان أسطوري مثالي! (3 نجوم)' : 'اكتمل المستوى بنجاح!',
      subtitle: `أحرزت ${stars} نجوم وحصلت على ${rewards.coins} قطعة ذهبية 🪙 و +${rewards.xp} XP خبرة`,
      score: score,
      correctAnswers: activeZaytounaLevel.questions.length,
      totalQuestions: activeZaytounaLevel.questions.length,
      xpEarned: rewards.xp,
      starsEarned: stars,
      coinsEarned: rewards.coins,
      isPerfect: rewards.isPerfect,
    });
  };

  const startTowerMode = () => {
    sound.playClick();
    setActiveTab('tower');
    setCurrentMode('TOWER');
    setActiveZaytounaLevel(null);
  };

  const startBlitzMode = () => {
    sound.playClick();
    setActiveTab('blitz');
    setCurrentMode('BLITZ');
    setActiveZaytounaLevel(null);
  };

  const startDuelMode = () => {
    sound.playClick();
    setActiveTab('duel');
    setCurrentMode('DUEL');
    setActiveZaytounaLevel(null);
  };

  // Launch a specific stage in Journey Mode
  const handleSelectStage = (stage: Stage) => {
    sound.playClick();
    // Filter questions matching this era or general
    const eraQuestions = QUESTIONS_DATABASE.filter(
      (q) => q.era === stage.eraId || q.category === 'history' || q.category === 'eras'
    );
    const selected = eraQuestions.slice(0, stage.questionCount);
    // If not enough, fill with other questions
    const finalQuestions = selected.length >= stage.questionCount
      ? selected
      : [...selected, ...QUESTIONS_DATABASE.slice(0, stage.questionCount - selected.length)];

    setActiveStage(stage);
    setStageQuestions(finalQuestions);
    setStageQuestionIndex(0);
    setStageScore(0);
    setStageCorrectCount(0);
    setCurrentMode('JOURNEY');
  };

  const handleStageAnswer = (selectedIndex: number, timeTakenSeconds: number) => {
    const currentQ = stageQuestions[stageQuestionIndex];
    const isCorrect = selectedIndex === currentQ.correctIndex;

    let pointsEarned = 0;
    let nextCorrect = stageCorrectCount;

    if (isCorrect) {
      pointsEarned = currentQ.points + Math.max(0, 25 - timeTakenSeconds) * 2;
      nextCorrect += 1;
      setStageCorrectCount(nextCorrect);
      setStageScore((prev) => prev + pointsEarned);
    }

    if (stageQuestionIndex + 1 < stageQuestions.length) {
      setStageQuestionIndex((prev) => prev + 1);
    } else {
      // Completed Stage!
      const finalScore = stageScore + pointsEarned;
      const accuracy = Math.round((nextCorrect / stageQuestions.length) * 100);
      const stars = calculateStageStars(finalScore, activeStage!.targetScore, accuracy);
      const xpGain = finalScore + stars * 100;

      // Update player stars and badges
      updateStats((prev) => {
        const newStars = { ...prev.eraStars };
        if (!newStars[activeStage!.id] || newStars[activeStage!.id] < stars) {
          newStars[activeStage!.id] = stars;
        }

        const badges = [...prev.badges];
        if (stars > 0 && !badges.includes('first_win')) badges.push('first_win');
        if (stars === 3 && !badges.includes('perfect_3_stars')) badges.push('perfect_3_stars');
        if (activeStage!.isBoss && activeStage!.eraId === 'ancient' && !badges.includes('ancient_master')) {
          badges.push('ancient_master');
        }
        if (activeStage!.isBoss && activeStage!.eraId === 'islamic_golden' && !badges.includes('islamic_master')) {
          badges.push('islamic_master');
        }

        return {
          ...prev,
          xp: prev.xp + xpGain,
          totalGames: prev.totalGames + 1,
          totalCorrect: prev.totalCorrect + nextCorrect,
          totalAnswered: prev.totalAnswered + stageQuestions.length,
          eraStars: newStars,
          badges,
        };
      });

      setGameOverData({
        isOpen: true,
        title: stars > 0 ? 'اكتملت المرحلة بنجاح باهر!' : 'انتهت محاولة المرحلة',
        subtitle: `حققت ${stars} نجوم في مرحلة "${activeStage!.title}"`,
        score: finalScore,
        correctAnswers: nextCorrect,
        totalQuestions: stageQuestions.length,
        xpEarned: xpGain,
        starsEarned: stars,
      });
    }
  };

  // Tower game finished
  const handleTowerFinish = (
    prizeWon: number,
    tierReached: number,
    statsUpdate: { correct: number; total: number }
  ) => {
    const xpGain = Math.round(prizeWon / 10) + 150;
    updateStats((prev) => {
      const badges = [...prev.badges];
      if (tierReached >= 5 && !badges.includes('tower_5')) badges.push('tower_5');
      if (tierReached >= 10 && !badges.includes('tower_10')) badges.push('tower_10');
      if (tierReached >= 15 && !badges.includes('tower_millionaire')) badges.push('tower_millionaire');

      return {
        ...prev,
        xp: prev.xp + xpGain,
        totalGames: prev.totalGames + 1,
        totalCorrect: prev.totalCorrect + statsUpdate.correct,
        totalAnswered: prev.totalAnswered + statsUpdate.total,
        towerRecord: Math.max(prev.towerRecord, tierReached),
        badges,
      };
    });

    setGameOverData({
      isOpen: true,
      title: tierReached >= 15 ? 'أسطورة المليون! قمة برج العباقرة' : 'انتهت جولة برج العباقرة',
      subtitle: `بلغت الدرجة ${tierReached} من 15 وأحرزت ${prizeWon.toLocaleString()} نقطة`,
      score: prizeWon,
      correctAnswers: statsUpdate.correct,
      totalQuestions: statsUpdate.total,
      xpEarned: xpGain,
    });
  };

  // Blitz finished
  const handleBlitzFinish = (
    finalScore: number,
    statsUpdate: { correct: number; total: number; highestStreak: number }
  ) => {
    const xpGain = Math.round(finalScore / 2) + 100;
    updateStats((prev) => {
      const badges = [...prev.badges];
      if (finalScore >= 1000 && !badges.includes('blitz_survivor')) badges.push('blitz_survivor');
      if (statsUpdate.highestStreak >= 5 && !badges.includes('streak_5')) badges.push('streak_5');
      if (statsUpdate.highestStreak >= 10 && !badges.includes('streak_10')) badges.push('streak_10');

      return {
        ...prev,
        xp: prev.xp + xpGain,
        totalGames: prev.totalGames + 1,
        totalCorrect: prev.totalCorrect + statsUpdate.correct,
        totalAnswered: prev.totalAnswered + statsUpdate.total,
        highestStreak: Math.max(prev.highestStreak, statsUpdate.highestStreak),
        blitzRecord: Math.max(prev.blitzRecord, finalScore),
        badges,
      };
    });

    setGameOverData({
      isOpen: true,
      title: 'انتهى زمن سرعة النبض!',
      subtitle: `حققت ${finalScore.toLocaleString()} نقطة مع أعلى سلسلة ${statsUpdate.highestStreak} إجابات`,
      score: finalScore,
      correctAnswers: statsUpdate.correct,
      totalQuestions: statsUpdate.total,
      xpEarned: xpGain,
    });
  };

  // Duel finished
  const handleDuelFinish = (
    won: boolean,
    playerScore: number,
    aiScore: number,
    statsUpdate: { correct: number; total: number }
  ) => {
    const xpGain = playerScore + (won ? 300 : 100);
    updateStats((prev) => {
      const badges = [...prev.badges];
      if (won && !badges.includes('ai_conqueror')) badges.push('ai_conqueror');

      return {
        ...prev,
        xp: prev.xp + xpGain,
        totalGames: prev.totalGames + 1,
        totalCorrect: prev.totalCorrect + statsUpdate.correct,
        totalAnswered: prev.totalAnswered + statsUpdate.total,
        badges,
      };
    });

    setGameOverData({
      isOpen: true,
      title: won ? 'انتصار مستحق في مبارزة النواة!' : 'مبارزة قوية ومتقاربة!',
      subtitle: `نتيجتك: ${playerScore} نقطة · نتيجة المنافس: ${aiScore} نقطة`,
      score: playerScore,
      correctAnswers: statsUpdate.correct,
      totalQuestions: statsUpdate.total,
      xpEarned: xpGain,
    });
  };

  // Start Daily Quest
  const handleStartDaily = () => {
    setIsDailyOpen(false);
    const dailySet = QUESTIONS_DATABASE.slice(0, 5);
    setActiveStage({
      id: 'daily_quest',
      eraId: 'ancient',
      stageNumber: 1,
      title: 'التحدي اليومي',
      subtitle: 'خمسة أسئلة فكرية متنوعة',
      description: 'أجب عن التحدي اليومي لرفع رتبتك ومضاعفة خبرتك.',
      isBoss: false,
      requiredStarsToUnlock: 0,
      questionCount: 5,
      targetScore: 500,
    });
    setStageQuestions(dailySet);
    setStageQuestionIndex(0);
    setStageScore(0);
    setStageCorrectCount(0);
    setCurrentMode('JOURNEY');
  };

  const returnHome = () => {
    setCurrentMode(null);
    setActiveStage(null);
    setActiveZaytounaLevel(null);
    setActiveTab('home');
    setGameOverData((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div
      className={`min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans transition-all ${
        settings.highContrast ? 'contrast-125' : ''
      }`}
      dir="rtl"
    >
      {/* Top Header */}
      <Header
        stats={stats}
        settings={settings}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') {
            setCurrentMode(null);
            setActiveStage(null);
          } else if (tab === 'journey') {
            setCurrentMode(null);
            setActiveStage(null);
          } else if (tab === 'tower') {
            startTowerMode();
          } else if (tab === 'blitz') {
            startBlitzMode();
          } else if (tab === 'duel') {
            startDuelMode();
          }
        }}
        onOpenDaily={() => setIsDailyOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* View 0: Zaytouna Active Level Playing Arena */}
        {activeZaytounaLevel && activeZaytounaStage && (
          <LevelPlayArena
            level={activeZaytounaLevel}
            stageTitle={activeZaytounaStage.title}
            stageNumber={activeZaytounaStage.stageNumber}
            stats={stats}
            settings={settings}
            onLevelComplete={handleZaytounaLevelComplete}
            onExit={() => setActiveZaytounaLevel(null)}
            onUpdateStats={updateStats}
          />
        )}

        {/* View 1: Zaytouna World & Stages Map (when not currently in level) */}
        {activeTab === 'stages' && !activeZaytounaLevel && (
          <ZaytounaMap
            stats={stats}
            settings={settings}
            onSelectLevel={handleSelectZaytounaLevel}
            onUpdateStats={updateStats}
            onBackToHub={() => setActiveTab('home')}
          />
        )}

        {/* View 2: Active Journey Stage Questions */}
        {currentMode === 'JOURNEY' && activeStage && stageQuestions.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-3 px-5">
              <span className="font-heading font-bold text-white text-sm md:text-base">
                {activeStage.title} · {activeStage.subtitle}
              </span>
              <button
                onClick={() => {
                  sound.playClick();
                  setCurrentMode(null);
                  setActiveTab('journey');
                }}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 cursor-pointer"
              >
                العودة للخارطة
              </button>
            </div>

            <ArenaQuestion
              question={stageQuestions[stageQuestionIndex]}
              questionNumber={stageQuestionIndex + 1}
              totalQuestions={stageQuestions.length}
              timeLimitSeconds={25}
              onAnswer={handleStageAnswer}
              settings={settings}
              scoreDisplay={stageScore}
            />
          </div>
        )}

        {/* View 3: Tower Ascension Mode */}
        {currentMode === 'TOWER' && (
          <TowerAscension
            questions={QUESTIONS_DATABASE}
            settings={settings}
            onFinishGame={handleTowerFinish}
            onExit={returnHome}
          />
        )}

        {/* View 4: Blitz Pulse Survival Mode */}
        {currentMode === 'BLITZ' && (
          <BlitzPulse
            questions={QUESTIONS_DATABASE}
            settings={settings}
            onFinishGame={handleBlitzFinish}
            onExit={returnHome}
          />
        )}

        {/* View 5: Cortex Duel Mode */}
        {currentMode === 'DUEL' && (
          <CortexDuel
            questions={QUESTIONS_DATABASE}
            settings={settings}
            onFinishGame={handleDuelFinish}
            onExit={returnHome}
          />
        )}

        {/* View 6: Era Journey Map */}
        {activeTab === 'journey' && !currentMode && (
          <EraJourneyMap
            stats={stats}
            onSelectStage={handleSelectStage}
            onBackToHub={() => setActiveTab('home')}
          />
        )}

        {/* View 7: Home Page Hub */}
        {activeTab === 'home' && !currentMode && !activeZaytounaLevel && (
          <div className="flex flex-col gap-10">
            <HeroBanner
              onStartJourney={() => setActiveTab('stages')}
              onStartTower={startTowerMode}
            />

            <ModeSelector
              stats={stats}
              onSelectMode={handleSelectMode}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>أفق المعرفة الكبرى · الصرح الثقافي فائق التطور</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              إمكانية الوصول والصوت
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              سجل الإنجازات والأوسمة
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <DailyQuestModal
        stats={stats}
        isOpen={isDailyOpen}
        onClose={() => setIsDailyOpen(false)}
        onStartDaily={handleStartDaily}
      />

      <ProfileModal
        stats={stats}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
      />

      <GameOverModal
        title={gameOverData.title}
        subtitle={gameOverData.subtitle}
        score={gameOverData.score}
        correctAnswers={gameOverData.correctAnswers}
        totalQuestions={gameOverData.totalQuestions}
        xpEarned={gameOverData.xpEarned}
        starsEarned={gameOverData.starsEarned}
        coinsEarned={gameOverData.coinsEarned}
        isPerfect={gameOverData.isPerfect}
        isOpen={gameOverData.isOpen}
        onNextLevel={
          activeZaytounaStage && activeZaytounaLevel
            ? () => {
                const currentIdx = activeZaytounaStage.levels.findIndex((l) => l.id === activeZaytounaLevel.id);
                if (currentIdx >= 0 && currentIdx + 1 < activeZaytounaStage.levels.length) {
                  setGameOverData((prev) => ({ ...prev, isOpen: false }));
                  const nextLvl = activeZaytounaStage.levels[currentIdx + 1];
                  handleSelectZaytounaLevel(nextLvl, activeZaytounaStage);
                } else {
                  setGameOverData((prev) => ({ ...prev, isOpen: false }));
                  setActiveZaytounaLevel(null);
                  setActiveTab('stages');
                }
              }
            : undefined
        }
        onReturnToStages={
          activeZaytounaStage
            ? () => {
                setGameOverData((prev) => ({ ...prev, isOpen: false }));
                setActiveZaytounaLevel(null);
                setActiveTab('stages');
              }
            : undefined
        }
        onPlayAgain={() => {
          setGameOverData((prev) => ({ ...prev, isOpen: false }));
          if (activeZaytounaLevel && activeZaytounaStage) {
            handleSelectZaytounaLevel(activeZaytounaLevel, activeZaytounaStage);
          } else if (activeTab === 'tower') startTowerMode();
          else if (activeTab === 'blitz') startBlitzMode();
          else if (activeTab === 'duel') startDuelMode();
          else if (activeStage) handleSelectStage(activeStage);
        }}
        onReturnHome={returnHome}
      />
    </div>
  );
}
