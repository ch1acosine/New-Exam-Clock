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
  const [examName, setExamName] = useState<string>('期中考');
  const [examPreset, setExamPreset] = useState<string>('期中考'); // Presets: '第一次期中考', '第二次期中考', '期中考', '期末考', '自行設定'
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
              
              {/* Exam Name Select Presets */}
              <div id="field_exam_name_presets" className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 block">
                  📝 設定考試名稱
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                  {['第一次期中考', '第二次期中考', '期中考', '期末考', '自行設定'].map((preset) => (
                    <button
                      id={`exam_preset_btn_${preset}`}
                      key={preset}
                      type="button"
                      onClick={() => {
                        setExamPreset(preset);
                        if (preset !== '自行設定') {
                          setExamName(preset);
                        }
                        playChime(600, 'sine', 0.05);
                      }}
                      className={`px-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                        examPreset === preset
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-zinc-850 hover:bg-zinc-800 border-white/5 text-zinc-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Always-editable Exam Name text input field */}
                <input
                  id="input_exam_name"
                  type="text"
                  value={examName}
                  onChange={(e) => {
                    setExamName(e.target.value);
                    setExamPreset('自行設定'); // switch to custom automatically if they type
                  }}
                  className="w-full bg-zinc-800 border-none rounded-xl p-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/80 transition-all text-white placeholder-zinc-600"
                  placeholder="請輸入或選擇考試名稱"
                />
              </div>

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
                  className="bg-zinc-800 border-none rounded-xl p-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/80 transition-all text-white placeholder-zinc-600"
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

              {/* Dynamic calculated duration display */}
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4.5 flex items-center justify-between font-mono text-sm text-zinc-300">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  自動估算之考試總長度：
                </span>
                <span className="text-lg font-black text-blue-400">
                  {(() => {
                    try {
                      const [startH, startM] = startTime.split(':').map(Number);
                      const [endH, endM] = endTime.split(':').map(Number);
                      if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return '請設定時間';
                      const sObj = new Date();
                      sObj.setHours(startH, startM, 0, 0);
                      const eObj = new Date();
                      eObj.setHours(endH, endM, 0, 0);
                      if (eObj.getTime() < sObj.getTime()) {
                        eObj.setDate(eObj.getDate() + 1);
                      }
                      const mins = Math.round((eObj.getTime() - sObj.getTime()) / 60000);
                      return `${mins} 分鐘`;
                    } catch {
                      return '計算中...';
                    }
                  })()}
                </span>
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
        <div id="clock_view" className="h-screen overflow-hidden flex flex-col justify-between p-4 sm:p-5 bg-[#050505] text-[#f8fafc] transition-all duration-300 select-none">
          
          {/* Subtle upper utility strip (Very Compact) */}
          <div id="top_strip_control" className="flex items-center justify-between border-b border-zinc-800/20 dark:border-white/5 pb-2.5 w-full shrink-0">
            <button
              id="back_to_setup_btn"
              onClick={() => {
                if (confirm('確定要返回設定頁面嗎？這會重置目前的即時數據。')) {
                  setScreen('setup');
                }
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-sm transition-all font-bold border cursor-pointer ${
                theme === 'dark'
                  ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border-zinc-300 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>重新設定</span>
            </button>

            {/* Title / Current Exam Preset Center Block */}
            <div className={`font-sans font-black text-base sm:text-lg tracking-wider ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
              {examName}
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
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
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
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark' 
                    ? 'border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10' 
                    : 'border-indigo-500/30 text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10'
                }`}
                title={theme === 'dark' ? "高對比白色背景" : "暗黑投影背景"}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Native screen maximizer */}
              <button
                id="fullscreen_toggle_btn"
                onClick={toggleFullscreen}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-zinc-800 text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-900'
                    : 'border-zinc-300 text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-150'
                }`}
                title="全螢幕模式"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* DYNAMIC EMERGENCY BANNER */}
          {customBanner && (
            <div 
              id="critical_alert_bar" 
              className="my-2 bg-red-650 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-between shadow-lg shrink-0"
            >
              <div className="flex items-center space-x-3 text-base md:text-lg">
                <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />
                <span>{customBanner}</span>
              </div>
              <button 
                id="close_banner_btn"
                onClick={clearTenMinsAlert}
                className="p-1 hover:bg-red-750 rounded-full transition-all text-white/95 cursor-pointer"
                title="清除提示"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* GIANT CENTRAL CLOCK VIEW - Maximized layout */}
          <div 
            id="bento_main_clock_module"
            className={`flex-grow rounded-[2rem] border p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 my-3.5 min-h-0 ${
              theme === 'dark' 
                ? 'bg-[#111111] border-white/5 text-white' 
                : 'bg-white border-zinc-250 shadow-sm text-zinc-950'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${
              isTenMinsAlertActive 
                ? 'from-red-500/5' 
                : theme === 'dark' 
                  ? 'from-blue-500/5' 
                  : 'from-zinc-100/30'
            } to-transparent`}></div>

            {/* Clock read-out - EXTREMELY ENLARGED, NO PULSING COLON, UNIFORM COLOR */}
            <div 
              id="current_time_readout" 
              className="text-[15vw] sm:text-[14vw] lg:text-[13vw] font-black tracking-tighter tabular-nums leading-none flex items-center justify-center relative z-10 cursor-pointer"
              title="雙擊可複製當前時間"
              onDoubleClick={() => {
                navigator.clipboard.writeText(`${formattedClock.hrs}:${formattedClock.mins}:${formattedClock.secs}`);
                playChime(1000, 'sine', 0.05);
              }}
            >
              <span>{formattedClock.hrs}</span>
              <span className="text-blue-500 dark:text-blue-400 mx-1.5">:</span>
              <span>{formattedClock.mins}</span>
              <span className="text-blue-500 dark:text-blue-400 mx-1.5">:</span>
              <span>{formattedClock.secs}</span>
            </div>
          </div>

          {/* HIGH CONTRAST EXAM INFORMATION MATRIX & ATTENDANCE & IN-PLACE REMINDERS */}
          <div id="exam_information_matrix" className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-7xl mx-auto mb-2 shrink-0">
            
            {/* COLUMN 1: EXAM BASIC INFORMATION */}
            <div 
              id="info_box_exam_details" 
              className={`rounded-[1.5rem] p-5 border flex flex-col justify-between transition-all duration-300 ${
                theme === 'dark' 
                  ? 'bg-[#111111] border-white/5 text-white' 
                  : 'bg-white border-zinc-250 shadow-sm text-zinc-950'
              }`}
            >
              <div className="space-y-2.5 font-sans">
                <div className="flex items-center space-x-2 pb-1 border-b border-zinc-500/10">
                  <span className="text-base font-black text-blue-500 dark:text-blue-400">📄 考試項目</span>
                </div>
                <div className="text-sm sm:text-base">
                  <span className="text-zinc-550 dark:text-zinc-300 font-bold mr-1">名稱：</span>
                  <span className="font-extrabold text-zinc-900 dark:text-white">{examName}</span>
                </div>
                <div className="text-sm sm:text-base">
                  <span className="text-zinc-550 dark:text-zinc-300 font-bold mr-1">科目：</span>
                  <span className="font-extrabold text-zinc-900 dark:text-white">{subject}</span>
                </div>
                <div className="text-sm sm:text-base">
                  <span className="text-zinc-550 dark:text-zinc-300 font-bold mr-1">時間：</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">{startTime} 至 {endTime}</span>
                </div>
              </div>

              {/* Status Alert Indicator */}
              <div className="mt-3 pt-2.5 border-t border-zinc-500/10 flex items-center justify-between text-xs sm:text-sm font-black font-mono">
                <span className="text-zinc-500">進度狀態：</span>
                <span className={`px-2 py-0.5 rounded-lg ${
                  metrics.status === 'ended' 
                    ? 'text-red-500 bg-red-550/10' 
                    : isTenMinsAlertActive 
                      ? 'text-red-500 animate-pulse' 
                      : 'text-blue-650 dark:text-blue-400 bg-blue-500/10'
                }`}>
                  {metrics.status === 'not-started' && `尚未開始`}
                  {metrics.status === 'running' && `已進行 ${metrics.timeFromStartMins} 分 / 剩 ${metrics.remainingTimeMins} 分`}
                  {metrics.status === 'ended' && "考試已結束"}
                </span>
              </div>
            </div>

            {/* COLUMN 2: ATTENDANCE BLOCK WITH DIRECT INTERACTIVE +/- BUTTONS */}
            <div 
              id="info_box_attendance_direct" 
              className={`rounded-[1.5rem] p-5 border flex flex-col justify-between transition-all duration-300 ${
                theme === 'dark' 
                  ? 'bg-[#111111] border-white/5 text-white' 
                  : 'bg-white border-zinc-250 shadow-sm text-zinc-950'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-zinc-500/10">
                  <span className="text-base font-black text-blue-500 dark:text-blue-400">👥 應到與實到人數</span>
                </div>
                
                {/* Expected & Actual display */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-zinc-150 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-300 dark:border-white/5">
                    <span className="text-xs text-zinc-550 dark:text-zinc-300 font-bold block">應到人數</span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">{expectedCount} <span className="text-xs font-bold text-zinc-500">人</span></span>
                  </div>

                  <div className="bg-zinc-150 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-300 dark:border-white/5 flex flex-col justify-between relative">
                    <span className="text-xs text-zinc-550 dark:text-zinc-300 font-bold block">實到人數</span>
                    <div className="flex items-center justify-center space-x-2 mt-1">
                      <button
                        onClick={() => {
                          setActualCount(prev => Math.max(0, prev - 1));
                          playChime(370, 'sine', 0.05);
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-300 dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-700 hover:text-white rounded-md border border-zinc-400/20 active:scale-90 transition-all cursor-pointer text-zinc-800 dark:text-white text-xs font-black"
                        title="扣除實到人數"
                      >
                        -
                      </button>
                      <span className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                        {actualCount}
                      </span>
                      <button
                        onClick={() => {
                          setActualCount(prev => Math.min(expectedCount, prev + 1));
                          playChime(490, 'sine', 0.05);
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-300 dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-700 hover:text-white rounded-md border border-zinc-400/20 active:scale-90 transition-all cursor-pointer text-zinc-800 dark:text-white text-xs font-black"
                        title="增加實到人數"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance breakdown percentage and absent sum */}
              <div className="mt-3 pt-2.5 border-t border-zinc-500/10 flex items-center justify-between text-xs sm:text-sm font-black font-mono">
                <span className="text-zinc-500">缺席人數：<strong className={absentCount > 0 ? "text-red-500 font-black" : "text-zinc-900 dark:text-white font-extrabold"}>{absentCount} 人</strong></span>
                <span className="text-zinc-500">出席率：<strong className="text-zinc-900 dark:text-white font-extrabold">{Math.round((actualCount / (expectedCount || 1)) * 100)}%</strong></span>
              </div>
            </div>

            {/* COLUMN 3: IN-PLACE REMINDERS DIRECTLY TYPABLE */}
            <div 
              id="alerts_and_reminders_container" 
              className={`rounded-[1.5rem] p-5 border flex flex-col justify-between relative transition-all duration-500 ${
                isTenMinsAlertActive 
                  ? 'bg-red-950/20 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : theme === 'dark'
                    ? 'bg-[#111111] border-white/5 text-white'
                    : 'bg-white border-zinc-250 shadow-sm text-zinc-950'
              }`}
            >
              <div className="flex flex-col flex-grow h-full justify-between">
                <div className="flex items-center space-x-2 pb-1 border-b border-zinc-500/10 mb-2">
                  <Bell className={`w-4 h-4 ${isTenMinsAlertActive ? 'text-red-400' : 'text-zinc-400'}`} />
                  <span className="text-base font-black text-blue-500 dark:text-blue-400">📢 考場提醒事項 (可直接在此輸入)</span>
                </div>

                <textarea
                  id="direct_reminders_textarea"
                  value={reminders}
                  onChange={(e) => {
                    setReminders(e.target.value);
                  }}
                  className={`w-full flex-grow bg-transparent border-0 resize-none outline-none focus:ring-0 focus:outline-none p-1 text-sm sm:text-base font-bold leading-relaxed tracking-wide ${
                    isTenMinsAlertActive 
                      ? 'text-red-500 font-extrabold' 
                      : theme === 'dark' 
                        ? 'text-zinc-200' 
                        : 'text-[#1e293b]'
                  }`}
                  placeholder="可在此直接點擊並編輯考場提醒與公告..."
                />
              </div>
            </div>

          </div>

          {/* FLOATING GEAR TRIGGER ICON */}
          <button
            id="floating_settings_gear_btn"
            onClick={() => {
              setIsControlOpen(!isControlOpen);
              playChime(700, 'sine', 0.08);
            }}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-zinc-900/95 backdrop-blur-md border border-white/10 text-white hover:text-blue-400 hover:scale-110 cursor-pointer shadow-2xl transition-all duration-300 hover:rotate-45 group z-40"
            title="調整考試結束時間"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* SIMPLIFIED SMALL TEACHER CONTROLS DIALOG (BOTTOM-RIGHT COMPACT MODE) */}
          {isControlOpen && (
            <div 
              id="compact_time_control_popover"
              className={`fixed bottom-22 right-6 w-72 rounded-2xl p-4 shadow-2xl border z-50 flex flex-col gap-3 font-sans ${
                theme === 'dark'
                  ? 'bg-[#141414] border-white/15 text-white'
                  : 'bg-white border-zinc-350 text-zinc-950 shadow-2xl'
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-500/10 pb-2">
                <span className="font-black text-sm flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                  <Clock className="w-4 h-4" /> 變更結束時間
                </span>
                <button 
                  onClick={() => setIsControlOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time Adjustment Action Row */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    id="edit_end_time_input"
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                    }}
                    className={`flex-grow border rounded-xl py-2 px-3 text-sm font-semibold font-mono outline-none text-center ${
                      theme === 'dark' 
                        ? 'bg-zinc-900 border-white/10 text-white' 
                        : 'bg-zinc-100 border-zinc-300 text-zinc-950'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    id="plus_5_mins_direct_btn"
                    onClick={() => {
                      const [h, m] = endTime.split(':').map(Number);
                      const dObj = new Date();
                      dObj.setHours(h, m, 0, 0);
                      const newD = new Date(dObj.getTime() + 5 * 60 * 1000);
                      const finalTime = `${String(newD.getHours()).padStart(2, '0')}:${String(newD.getMinutes()).padStart(2, '0')}`;
                      setEndTime(finalTime);
                      playChime(660, 'sine', 0.05);
                    }}
                    className="py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    +5 分鐘
                  </button>
                  <button
                    id="plus_10_mins_direct_btn"
                    onClick={() => {
                      const [h, m] = endTime.split(':').map(Number);
                      const dObj = new Date();
                      dObj.setHours(h, m, 0, 0);
                      const newD = new Date(dObj.getTime() + 10 * 60 * 1000);
                      const finalTime = `${String(newD.getHours()).padStart(2, '0')}:${String(newD.getMinutes()).padStart(2, '0')}`;
                      setEndTime(finalTime);
                      playChime(660, 'sine', 0.05);
                    }}
                    className="py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    +10 分鐘
                  </button>
                </div>
              </div>

              {/* Footer indicator */}
              <div className="text-[10px] text-zinc-500 text-center leading-tight pt-1">
                變更結束時間將即時同步。
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
