import { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Users, 
  UserCheck, 
  Bell, 
  Settings, 
  Sun, 
  Moon, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Minus, 
  Play, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Volume2, 
  VolumeX,
  Sparkles,
  Info
} from 'lucide-react';

export default function App() {
  // Screens: 'setup' | 'clock'
  const [screen, setScreen] = useState<'setup' | 'clock'>('setup');

  // Core Exam Info State
  const [subject, setSubject] = useState<string>('大氣動力學二');
  const [startTime, setStartTime] = useState<string>('08:10');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [expectedCount, setExpectedCount] = useState<number>(50);
  const [actualCount, setActualCount] = useState<number>(50);
  const [absentCount, setAbsentCount] = useState<number>(0);

  // Settings & Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isControlOpen, setIsControlOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  // Custom Reminders & Quick Announcements
  const [reminders, setReminders] = useState<string>('1. 請將手機與電子設備關機，並放至講台前方或包包內。\n2. 答案卡/卷請用黑色或藍色鋼筆/原子筆書寫，經查核身份後請勿隨意交談。');
  const [originalReminders, setOriginalReminders] = useState<string>(''); // Back up original when remaining 10 mins overwrites or prefixes
  const [isTenMinsAlertActive, setIsTenMinsAlertActive] = useState<boolean>(false);
  const [customBanner, setCustomBanner] = useState<string>('');

  // Ticking Current Time Date Object
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Input states for control center to facilitate editing
  const [editEndTime, setEditEndTime] = useState<string>('10:00');
  const [editSubject, setEditSubject] = useState<string>('大氣動力學二');
  const [editReminders, setEditReminders] = useState<string>('');

  // Sound notification trigger ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync absent count when expected or actual updates
  useEffect(() => {
    const calculated = expectedCount - actualCount;
    setAbsentCount(calculated >= 0 ? calculated : 0);
  }, [expectedCount, actualCount]);

  // Keep ticking the current local clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to keyboard shortcut 'M' or 'm' to open hidden control panel discretely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        // Only trigger if we are on the clock screen and not focusing an input or textarea
        const activeEl = document.activeElement;
        const isEditingInput = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          activeEl.getAttribute('contenteditable') === 'true'
        );
        if (screen === 'clock' && !isEditingInput) {
          e.preventDefault();
          setIsControlOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen]);

  // Sync edit helpers on enter or modification
  useEffect(() => {
    if (isControlOpen) {
      setEditEndTime(endTime);
      setEditSubject(subject);
      setEditReminders(reminders);
    }
  }, [isControlOpen]);

  // Play browser synthesizer sound alert whenever alert is triggered
  const playChime = (frequency: number = 523.25, type: OscillatorType = 'sine', duration: number = 0.5) => {
    if (!isSoundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      // Clean decay
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio context not supported or gestured blocker active.", e);
    }
  };

  // Multiple tones chime for special reminders
  const playAlertChime = () => {
    playChime(523.25, 'sine', 0.3); // C5
    setTimeout(() => playChime(659.25, 'sine', 0.3), 150); // E5
    setTimeout(() => playChime(783.99, 'sine', 0.4), 300); // G5
  };

  // Native fullscreen toggle helpers
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error("Error attempting to enable full-screen:", err));
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Fullscreen API not fully supported inside sandbox frame.", e);
    }
  };

  // Parse custom times to find elapsed and remaining metrics relative to today's date
  const computeTimeMetrics = () => {
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const startObj = new Date(currentTime);
      startObj.setHours(startH, startM, 0, 0);

      const endObj = new Date(currentTime);
      endObj.setHours(endH, endM, 0, 0);

      // Handle cases where the end time is scheduled past midnight (e.g., 23:00 - 01:00)
      if (endObj.getTime() < startObj.getTime()) {
        endObj.setDate(endObj.getDate() + 1);
      }

      const totalDurationMs = endObj.getTime() - startObj.getTime();
      const totalDurationMins = Math.max(1, Math.round(totalDurationMs / 60000));

      const timeFromStartMs = currentTime.getTime() - startObj.getTime();
      const timeFromStartMins = Math.floor(timeFromStartMs / 60000);

      const remainingTimeMs = endObj.getTime() - currentTime.getTime();
      const remainingTimeMins = Math.ceil(remainingTimeMs / 60000);

      let status: 'not-started' | 'running' | 'ended' = 'running';
      let progressPercent = 0;

      if (currentTime.getTime() < startObj.getTime()) {
        status = 'not-started';
        progressPercent = 0;
      } else if (currentTime.getTime() > endObj.getTime()) {
        status = 'ended';
        progressPercent = 100;
      } else {
        status = 'running';
        progressPercent = Number(((timeFromStartMins / totalDurationMins) * 100).toFixed(1));
      }

      return {
        totalDurationMins,
        timeFromStartMins,
        remainingTimeMins,
        status,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        startObj,
        endObj
      };
    } catch {
      return {
        totalDurationMins: 110,
        timeFromStartMins: 0,
        remainingTimeMins: 110,
        status: 'running' as const,
        progressPercent: 0,
        startObj: new Date(),
        endObj: new Date()
      };
    }
  };

  const metrics = computeTimeMetrics();

  // Helper: auto-generate preset times based on local current time rounded up to next 5 minutes
  const applyPresetTime = (durationMins: number) => {
    const now = new Date();
    // Round minutes to nearest future 5-minute block for realism
    let roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
    let startH = now.getHours();
    if (roundedMinutes >= 60) {
      roundedMinutes = 0;
      startH = (startH + 1) % 24;
    }

    const startStr = `${String(startH).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

    // Add duration
    const testDate = new Date();
    testDate.setHours(startH, roundedMinutes, 0, 0);
    const endDate = new Date(testDate.getTime() + durationMins * 60 * 1000);
    const endStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    setStartTime(startStr);
    setEndTime(endStr);
  };

  // Launch pre-exam with pre-existing settings
  const handleStartExam = () => {
    setScreen('clock');
    // Ensure actual matches expected initially unless modified
    setActualCount(expectedCount);
    // Play a friendly introductory sound
    playChime(440, 'sine', 0.2);
    setTimeout(() => playChime(554.37, 'sine', 0.3), 100);
  };

  // Trigger Quick Alert: Remaining 10 Minutes with gorgeous visual feedback
  const triggerRemaining10Mins = () => {
    setIsTenMinsAlertActive(true);
    playAlertChime();
    // Prepend or show visual alert in notes
    if (!originalReminders) {
      setOriginalReminders(reminders);
    }
    const cautionText = "⚠️【重要提示】考試時間剩餘最後 10 分鐘，請加緊作答並注意答案卡填塗！\n" + reminders;
    setReminders(cautionText);
    setEditReminders(cautionText);
    
    // Add a flashy screen flash reminder banner that can be closed
    setCustomBanner("🚨 提示：考試剩餘最後 10 分鐘！請特別注意答案卡與作答時限。");
  };

  // Cancel custom warning
  const clearTenMinsAlert = () => {
    setIsTenMinsAlertActive(false);
    if (originalReminders) {
      setReminders(originalReminders);
      setEditReminders(originalReminders);
      setOriginalReminders('');
    }
    setCustomBanner('');
  };

  // Apply Changes from Teacher Control Panel instantly
  const handleApplyChanges = () => {
    setSubject(editSubject);
    setEndTime(editEndTime);
    setReminders(editReminders);
    setIsControlOpen(false);
    playChime(587.33, 'sine', 0.2); // Success tone D5
  };

  // Quickly format standard date object to HH:MM:SS
  const formatTimeStr = (d: Date) => {
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return { hrs, mins, secs };
  };

  const formattedClock = formatTimeStr(currentTime);

  return (
    <div 
      id="app_root" 
      className={`min-h-screen select-none transition-all duration-300 font-sans ${
        theme === 'dark' 
          ? 'bg-[#050505] text-[#f8fafc]' 
          : 'bg-[#f4f4f7] text-[#0f172a]'
      }`}
    >
      
      {/* LANDING / INITIAL SETUP SCREEN */}
      {screen === 'setup' && (
        <div id="setup_view" className="flex flex-col items-center justify-center min-h-screen px-4 py-8 relative overflow-hidden bg-[#0A0A0A]">
          {/* Decorative ambient blobs */}
          <div className="absolute top-1/6 left-1/6 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-1/6 right-1/6 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Setup Bento-Inspired Card Container */}
          <div className="w-full max-w-2xl bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative z-10 text-white">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-500/20 p-3.5 rounded-2xl border border-blue-500/20">
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-black tracking-tight text-white">
                    監考系統設定
                  </h1>
                  <p className="text-xs text-zinc-500 mt-1 font-mono uppercase tracking-widest">
                    EXAM PROCTORING SYSTEM v1.2
                  </p>
                </div>
              </div>
              
              {/* Optional Quick Sound Toggle in Setup */}
              <button 
                id="setup_sound_btn"
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-white/5 text-zinc-300 hover:text-white transition-all active:scale-95"
                title={isSoundEnabled ? '關閉提示音' : '開啟提示音'}
              >
                {isSoundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              
              {/* Subject Input */}
              <div id="field_subject" className="space-y-2 flex flex-col">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  📖 考試科目
                </label>
                <input
                  id="input_subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-zinc-800 border-none rounded-xl p-4 text-xl outline-none focus:ring-2 focus:ring-blue-500/80 transition-all text-white placeholder-zinc-600"
                  placeholder="請輸入科目名稱，例如：大氣動力學二"
                />
              </div>

              {/* Time Configuration Grid */}
              <div id="field_time_grid" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    🕒 開始時間
                  </label>
                  <input
                    id="input_start_time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-zinc-800 border-none rounded-xl p-4 text-xl outline-none text-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    🏁 結束時間
                  </label>
                  <input
                    id="input_end_time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-zinc-800 border-none rounded-xl p-4 text-xl outline-none text-white font-mono"
                  />
                </div>
              </div>

              {/* Quick Time Presets helper */}
              <div id="field_time_presets" className="space-y-2.5">
                <span className="block text-xs font-bold uppercase tracking-widest text-zinc-600">
                  ⚡ 快速設定考試長度 (依目前時間自動產生 start / end)
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {[50, 80, 100, 110, 120].map((mins) => (
                    <button
                      id={`preset_btn_${mins}`}
                      key={mins}
                      type="button"
                      onClick={() => applyPresetTime(mins)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-white/5 text-zinc-300 transition-all active:scale-95"
                    >
                      {mins} 分鐘
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendance Configuration Block */}
              <div id="field_attendance" className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block">
                  👥 應到人數
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    id="expected_dec_btn"
                    type="button"
                    onClick={() => setExpectedCount(prev => Math.max(1, prev - 1))}
                    className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 active:scale-90 transition-all border border-white/5"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    id="input_expected_count"
                    type="number"
                    value={expectedCount}
                    onChange={(e) => setExpectedCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="bg-zinc-800 border-none rounded-xl p-3 flex-grow text-center text-white focus:outline-none text-2xl font-black font-mono"
                    min="1"
                  />
                  <button
                    id="expected_inc_btn"
                    type="button"
                    onClick={() => setExpectedCount(prev => prev + 1)}
                    className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 active:scale-90 transition-all border border-white/5"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Reminders Input */}
              <div id="field_reminders" className="space-y-2 flex flex-col">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                  📢 初始提醒事項 (可換行)
                </label>
                <textarea
                  id="input_reminders"
                  rows={3}
                  value={reminders}
                  onChange={(e) => setReminders(e.target.value)}
                  className="bg-zinc-800 border-none rounded-xl p-4 text-base outline-none text-white font-sans placeholder-zinc-600 leading-relaxed resize-none"
                  placeholder="每條提醒建議加上編號，讓投影更清晰"
                />
              </div>

            </div>

            {/* Launch Button */}
            <div className="mt-10 pt-6 border-t border-white/10">
              <button
                id="launch_clock_btn"
                onClick={handleStartExam}
                className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-2xl text-2xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-3 text-white cursor-pointer"
              >
                <Play className="w-7 h-7 fill-white text-white" />
                <span>進入監考大時鐘</span>
              </button>
              
              <div className="text-center mt-4">
                <span className="text-xs text-zinc-500">
                  💡 點擊後將切換至大尺寸、高對比的 Bento 監考視圖，適合大螢幕投影。
                </span>
              </div>
            </div>

          </div>
          
          {/* Footer branding */}
          <div className="mt-8 text-zinc-700 text-xs font-mono">
            Proctor Clock v1.2 • Client-Side Bento Design Grid System
          </div>
        </div>
      )}






      {/* GIANT PROCTOR SUPERVISION SCREEN */}
      {screen === 'clock' && (
        <div id="clock_view" className="flex flex-col min-h-screen relative p-4 md:p-8 lg:p-10">
          
          {/* Subtle upper utility strip */}
          <div id="top_strip_control" className="flex items-center justify-between border-b border-gray-800/10 dark:border-white/5 pb-4 mb-4 w-full">
            <button
              id="back_to_setup_btn"
              onClick={() => {
                if (confirm('確定要返回設定頁面嗎？這會重置目前的即時數據。')) {
                  setScreen('setup');
                }
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm transition-all font-medium border cursor-pointer ${
                theme === 'dark'
                  ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white border-white/5'
                  : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border-zinc-200 shadow-xs'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>重新設定</span>
            </button>

            {/* Meta indicator block strictly formatted, helpful but quiet */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>監考中 • 100% 離線運作</span>
            </div>

            {/* Quick config triggers */}
            <div className="flex items-center space-x-2">
              {/* Sound Option Toggle */}
              <button
                id="toggle_sound_clock_btn"
                onClick={() => {
                  setIsSoundEnabled(!isSoundEnabled);
                  playChime(600, 'sine', 0.1);
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSoundEnabled 
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' 
                    : 'border-zinc-800 text-zinc-500 bg-zinc-900/10 hover:bg-zinc-900/25'
                }`}
                title={isSoundEnabled ? "提示音已開啟" : "提示音已關閉"}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Theme toggle indicator */}
              <button
                id="theme_toggle_btn"
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  playChime(theme === 'dark' ? 880 : 440, 'sine', 0.05);
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark' 
                    ? 'border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10' 
                    : 'border-indigo-500/30 text-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10'
                }`}
                title={theme === 'dark' ? "高對比白色背景" : "暗黑投影背景"}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Native screen maximizer */}
              <button
                id="fullscreen_toggle_btn"
                onClick={toggleFullscreen}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-zinc-800 text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-900'
                    : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100'
                }`}
                title="全螢幕模式"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* DYNAMIC EMERGENCY BANNER BANNER */}
          {customBanner && (
            <div 
              id="critical_alert_bar" 
              className="mb-6 bg-red-650 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center space-x-3 text-lg md:text-xl">
                <AlertTriangle className="w-6 h-6 animate-pulse shrink-0" />
                <span>{customBanner}</span>
              </div>
              <button 
                id="close_banner_btn"
                onClick={clearTenMinsAlert}
                className="p-1 hover:bg-red-750 rounded-full transition-all text-white/95 cursor-pointer"
                title="清除提示"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* BENTO BLOCK 1: SUBJECT & TIME HEADER */}
          <div 
            id="info_box_subject_header"
            className={`rounded-[2rem] p-6 sm:p-8 border mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-[#111111] border-white/5 text-white' 
                : 'bg-white border-zinc-200/80 text-zinc-900 shadow-sm'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs sm:text-sm mb-1.5">
                EXAMINATION SUBJECT • 考試科目
              </span>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {subject}
              </h2>
            </div>
            
            <div className="text-left md:text-right flex flex-col shrink-0">
              <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs sm:text-sm mb-1.5">
                EXAM PERIOD • 考試時程
              </span>
              <div className="text-xl sm:text-3xl font-mono font-black tracking-tight text-blue-500 dark:text-blue-400">
                {startTime} <span className="text-zinc-500 text-sm sm:text-base font-normal mx-1">至</span> {endTime}
              </div>
            </div>
          </div>

          {/* BENTO BLOCK 2: CENTRAL MASSIVE CLOCK MODULE */}
          <div 
            id="bento_main_clock_module"
            className={`flex-grow rounded-[3.5rem] border p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 min-h-[340px] mb-6 ${
              theme === 'dark' 
                ? 'bg-[#111111] border-white/5 text-white' 
                : 'bg-white border-zinc-200 shadow-sm text-zinc-900'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${
              isTenMinsAlertActive 
                ? 'from-red-500/5' 
                : theme === 'dark' 
                  ? 'from-blue-500/5' 
                  : 'from-zinc-100/30'
            } to-transparent`}></div>
            
            {/* Upper label */}
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs sm:text-sm mb-4 relative z-10 block">
              🕒 中華民國標準時間 (CURRENT TIME)
            </span>

            {/* Giant clock readout */}
            <div 
              id="current_time_readout" 
              className="text-[14vw] sm:text-[13vw] font-black tracking-tighter tabular-nums leading-none flex items-center justify-center relative z-10 cursor-pointer"
              title="雙擊可複製當前時間"
            >
              <span>{formattedClock.hrs}</span>
              <span className="text-blue-500 dark:text-blue-400 animate-pulse-slow mx-1">:</span>
              <span>{formattedClock.mins}</span>
              <span className="text-blue-500 dark:text-blue-400 animate-pulse-slow mx-1">:</span>
              <span className={`${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-semibold text-[12vw] sm:text-[11vw]`}>
                {formattedClock.secs}
              </span>
            </div>

            {/* Timeline Progress bar integrated inside the clock module */}
            <div id="exam_progress_tracker" className="w-full max-w-4xl mt-8 relative z-10 block">
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold font-mono mb-2 text-zinc-500">
                <span>開始：{startTime}</span>
                
                <span className={`px-2 py-0.5 rounded-md ${
                  metrics.status === 'ended' 
                    ? 'text-red-550 bg-red-550/10' 
                    : isTenMinsAlertActive 
                      ? 'text-red-500' 
                      : 'text-blue-500 dark:text-blue-400 bg-blue-550/15'
                }`}>
                  {metrics.status === 'not-started' && `距離考試開始還有 ${metrics.remainingTimeMins} 分鐘`}
                  {metrics.status === 'running' && `已進行 ${metrics.timeFromStartMins} 分鐘，剩餘 ${metrics.remainingTimeMins} 分鐘`}
                  {metrics.status === 'ended' && "考試已結束！請立即停筆"}
                </span>

                <span>結束：{endTime}</span>
              </div>

              {/* Bento styled timeline progress */}
              <div className={`w-full h-3 sm:h-4 rounded-full overflow-hidden border ${
                theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-zinc-150 border-zinc-200'
              }`}>
                <div 
                  className={`h-full transition-all duration-1000 ${
                    metrics.status === 'ended' 
                      ? 'bg-red-550' 
                      : isTenMinsAlertActive 
                        ? 'bg-red-550 animate-pulse' 
                        : metrics.status === 'not-started'
                          ? 'bg-zinc-650'
                          : 'bg-blue-600'
                  }`}
                  style={{ width: `${metrics.progressPercent}%` }}
                ></div>
              </div>
            </div>

          </div>






          {/* BENTO BLOCK 3: BOTTOM GRID SYSTEM (3 COLS) */}
          <div id="exam_information_matrix" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 w-full max-w-7xl mx-auto">
            
            {/* STATS BENTO TILE - Column 1 */}
            <div 
              id="info_box_attendance" 
              className={`rounded-[2rem] p-8 border flex flex-col justify-between transition-all duration-300 ${
                theme === 'dark' 
                  ? 'bg-[#111111] border-white/5 text-white' 
                  : 'bg-white border-zinc-200 shadow-sm text-zinc-900'
              }`}
            >
              <div>
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs sm:text-sm block mb-4">
                  ATTENDANCE 人數 STATISTICS
                </span>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-sans font-black tracking-tight text-blue-500 dark:text-blue-400">
                    {actualCount}
                  </span>
                  <span className="text-3xl text-zinc-600 font-light">/</span>
                  <span className="text-2xl sm:text-3xl text-zinc-500 font-semibold">
                    {expectedCount}
                  </span>
                </div>
              </div>

              {/* Extra micro labels indicating breakdown */}
              <div className="mt-4 pt-4 border-t border-zinc-500/10 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>缺席：<strong className={absentCount > 0 ? "text-red-500" : ""}>{absentCount}</strong> 人</span>
                <span>出席率：<strong>{Math.round((actualCount / (expectedCount || 1)) * 100)}%</strong></span>
              </div>
            </div>






            {/* REMINDER BENTO TILE - Columns 2 & 3 */}
            <div 
              id="alerts_and_reminders_container" 
              className={`col-span-1 md:col-span-2 rounded-[2rem] p-8 border flex flex-col justify-center relative transition-all duration-500 ${
                isTenMinsAlertActive 
                  ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                  : theme === 'dark'
                    ? 'bg-[#111111] border-white/5 text-white'
                    : 'bg-white border-zinc-200 shadow-sm text-zinc-900'
              }`}
            >
              <div className="flex items-center space-x-2 mb-4">
                <Bell className={`w-5 h-5 ${isTenMinsAlertActive ? 'text-red-400' : 'text-zinc-400'}`} />
                <span className={`${isTenMinsAlertActive ? 'text-red-400' : 'text-zinc-500'} font-bold uppercase tracking-widest text-xs sm:text-sm`}>
                  REMINDER 提醒專區
                </span>
              </div>

              <p 
                className={`text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed tracking-wide ${
                  isTenMinsAlertActive 
                    ? 'text-red-500 font-extrabold' 
                    : theme === 'dark' 
                      ? 'text-zinc-200' 
                      : 'text-[#1e293b]'
                }`}
              >
                {reminders ? reminders : '請冷靜作答，並注意時間分配。祝各位考生作答順利。'}
              </p>
            </div>

          </div>

          {/* DISCRETE BOTTOM INSTRUCTIONS SHORTCUT */}
          <div className="mt-auto pt-6 text-center text-xs text-zinc-500 font-mono tracking-wide">
            按鍵盤 <kbd className="px-2 py-0.5 rounded bg-zinc-800/40 border border-zinc-700/50">M</kbd> 鍵可快速召喚教師控制面板 • 點擊右下角齒輪亦可操作
          </div>






          {/* FLOATING GEAR TRIGGER ICON */}
          <button
            id="floating_settings_gear_btn"
            onClick={() => {
              setIsControlOpen(!isControlOpen);
              playChime(700, 'sine', 0.08);
            }}
            className="fixed bottom-6 right-6 p-4 rounded-full bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white hover:text-blue-400 hover:scale-110 cursor-pointer shadow-2xl transition-all duration-300 hover:rotate-45 group z-40"
            title="開啟教師控制台"
          >
            <Settings className="w-7 h-7" />
          </button>

          {/* TEACHER HIDDEN CONTROL PANEL: SLIDE UP / OVERLAY (REALLY INTUITIVE & HANDY) */}
          {isControlOpen && (
            <div 
              id="teacher_control_overlay" 
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300"
              onClick={() => setIsControlOpen(false)}
            >
              {/* Box Modal */}
              <div 
                id="teacher_control_modal"
                className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-white relative z-50 overflow-y-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
              >
                
                {/* Status indicators */}
                <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-3.5 mb-5 text-sm text-zinc-400 flex items-center justify-between font-mono">
                  <span>科目：{subject}</span>
                  <span className="text-blue-400 font-bold">{metrics.totalDurationMins} 分鐘 總時數</span>
                </div>

                {/* Form controls */}
                <div className="space-y-4">
                  
                  {/* Change Subject name */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                      修改科目名稱
                    </label>
                    <input
                      id="edit_subject_name"
                      type="text"
                      className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-sans"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    />
                  </div>

                  {/* Change End Time */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                      變更結束時間 (HH:MM)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        id="edit_end_time"
                        type="time"
                        className="col-span-2 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                      />
                      {/* Plus 10 mins shortcut */}
                      <button
                        id="plus_10_mins_btn"
                        type="button"
                        onClick={() => {
                          const [h, m] = editEndTime.split(':').map(Number);
                          const dateObj = new Date();
                          dateObj.setHours(h, m, 0, 0);
                          const newDateObj = new Date(dateObj.getTime() + 10 * 60 * 1000);
                          const newTimeStr = `${String(newDateObj.getHours()).padStart(2, '0')}:${String(newDateObj.getMinutes()).padStart(2, '0')}`;
                          setEditEndTime(newTimeStr);
                          playChime(660, 'sine', 0.05);
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 border border-white/5 text-xs font-mono font-bold rounded-xl text-zinc-250 transition-all cursor-pointer"
                        title="增加 10 分鐘"
                      >
                        +10M
                      </button>
                    </div>
                  </div>

                  {/* Modify present/absent count directly */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                      變更實到人數 (總應到: {expectedCount} 人)
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        id="dec_actual_btn"
                        type="button"
                        onClick={() => {
                          setActualCount(prev => Math.max(0, prev - 1));
                          playChime(370, 'sine', 0.05);
                        }}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 border border-white/5 active:scale-95 transition-all cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <div className="flex-grow text-center bg-zinc-950/60 p-2 rounded-xl border border-white/5 font-mono">
                        <span className="text-[10px] text-zinc-500 block">與總應到自動同步</span>
                        <span className="text-xl font-bold text-emerald-400">{actualCount} 人</span>
                      </div>

                      <button
                        id="inc_actual_btn"
                        type="button"
                        onClick={() => {
                          setActualCount(prev => Math.min(expectedCount, prev + 1));
                          playChime(490, 'sine', 0.05);
                        }}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 border border-white/5 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 自訂提醒事項 Custom Reminder Text Area */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                      自訂提醒事項
                    </label>
                    <textarea
                      id="edit_reminders_text"
                      rows={3}
                      className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-550 transition-all font-sans text-xs leading-relaxed resize-none"
                      value={editReminders}
                      onChange={(e) => setEditReminders(e.target.value)}
                      placeholder="輸入欲更新之公告或法規..."
                    />
                  </div>

                </div>

                {/* Quick actions panel */}
                <div id="quick_panel_actions" className="mt-6 pt-4 border-t border-white/5 space-y-2.5">
                  <span className="block text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                    快速提醒廣播面板
                  </span>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Ten Minutes remaining shortcut */}
                    <button
                      id="action_ten_remaining_btn"
                      onClick={() => {
                        triggerRemaining10Mins();
                        setIsControlOpen(false); // Close to show results instantly
                      }}
                      className={`py-3 px-4 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center space-x-1 bg-red-650 hover:bg-red-500 border-none text-white`}
                    >
                      <span>剩餘 10 分鐘廣播</span>
                    </button>

                    {/* Clear custom warning alarms */}
                    <button
                      id="action_clear_all_alarms"
                      onClick={() => {
                        clearTenMinsAlert();
                        playChime(370, 'sine', 0.1);
                        setIsControlOpen(false);
                      }}
                      className="py-3 px-4 text-xs font-medium rounded-xl border border-white/5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                      ❌ 清除廣播警報
                    </button>
                  </div>
                </div>

                {/* Confirm Apply Actions Footer */}
                <div className="mt-6 pt-4 border-[#222222] border-t flex items-center justify-between space-x-3">
                  <span className="text-[10px] text-zinc-500 leading-tight">
                    💡 點擊儲存後，主畫面之投影數據與提醒專區將立即連動變更。
                  </span>
                  
                  <button
                    id="submit_edit_btn"
                    onClick={handleApplyChanges}
                    className="flex items-center space-x-1.5 px-6 py-3 font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md cursor-pointer text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>儲存並即時更新</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
