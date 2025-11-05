(() => {
  console.log("[typing-game] script loaded");

  // ====== 词库 ======
  const WORDS_EASY = "asdfjkl;ghqwertyuiopzxcvbnm".split("");
  const WORDS_NORMAL = [
    "cat","dog","sun","moon","star","home","desk","book","tree","game",
    "milk","blue","green","apple","orange","water","happy","smile","music","piano",
    "china","river","ocean","panda","robot","cloud","rain","light","mouse","keyboard"
  ];
  const WORDS_HARD = [
    "elephant","strawberry","chocolate","adventure","beautiful","airplane",
    "kangaroo","watermelon","universe","character","wonderful","notebook",
    "algorithm","bicycle","dinosaur","astronomy","telephone","blueberry",
    "microscope","photograph"
  ];

  // ====== 状态 ======
  let state = {
    running: false,
    paused: false,
    timeLeft: 60,
    target: "",
    typed: "",
    score: 0,
    streak: 0,
    hits: 0,
    total: 0,
    bestScore: 0,
    timerId: null,
  };

  const STORAGE_KEY = "typing-game:v1";

  function onReady() {
    console.log("[typing-game] DOM ready");

    // ====== DOM 获取 + 自检 ======
    const els = {
      playerName: byId("playerName"),
      saveNameBtn: byId("saveNameBtn"),
      difficulty: byId("difficulty"),
      duration: byId("duration"),
      startBtn: byId("startBtn"),
      pauseBtn: byId("pauseBtn"),
      resetBtn: byId("resetBtn"),
      timeLeft: byId("timeLeft"),
      score: byId("score"),
      accuracy: byId("accuracy"),
      streak: byId("streak"),
      bestScore: byId("bestScore"),
      promptText: byId("promptText"),
      typingInput: byId("typingInput"),
      historyList: byId("historyList"),
    };

    // 如果有任何元素没找到，直接报错并停止，避免“按钮没反应”的假象
    for (const [k, v] of Object.entries(els)) {
      if (!v) {
        console.error(`[typing-game] Missing DOM element: ${k}`);
        alert(`页面元素丢失：${k}。请确认 index.html 中 id 是否与 script.js 对应。`);
        return;
      }
    }
    console.log("[typing-game] all DOM elements OK");

    // ====== 本地存储 ======
    loadStorage(els);
    updateHUD(els);

    // 初始提示
    setPrompt(els, "准备好了吗？点击开始！");

    // ====== 事件绑定 ======
    els.saveNameBtn.addEventListener("click", () => {
      saveStorage(els);
      els.saveNameBtn.textContent = "已保存";
      setTimeout(() => (els.saveNameBtn.textContent = "保存"), 900);
    });

    els.startBtn.addEventListener("click", () => {
      console.log("[typing-game] start clicked");
      startGame(els);
    });
    els.pauseBtn.addEventListener("click", () => {
      console.log("[typing-game] pause clicked");
      pauseGame(els);
    });
    els.resetBtn.addEventListener("click", () => {
      console.log("[typing-game] reset clicked");
      resetGame(els, true);
    });

    els.typingInput.addEventListener("input", () => {
      if (!state.running || state.paused) return;
      state.total = Math.max(state.total, 0) + 1;
      const val = els.typingInput.value;
      els.promptText.innerHTML = highlight(val, state.target);
      const okLen = commonPrefixLen(val, state.target);
      const lastOk = okLen >= val.length;
      if (lastOk) {
        els.typingInput.classList.remove("error");
        els.typingInput.classList.add("ok");
        state.hits += 1;
      } else {
        els.typingInput.classList.remove("ok");
        els.typingInput.classList.add("error");
        state.streak = 0;
      }
      updateHUD(els);
    });

    els.typingInput.addEventListener("keydown", (e) => {
      if (!state.running || state.paused) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        submitWord(els);
      }
    });
  }

  // ====== 小工具 ======
  function byId(id) { return document.getElementById(id); }
  function escape(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function commonPrefixLen(a, b){ let i=0; for(;i<Math.min(a.length,b.length);i++){ if(a[i]!==b[i]) break; } return i; }
  function highlight(typed, target){
    const okLen = commonPrefixLen(typed, target);
    const ok = target.slice(0, okLen);
    const rest = target.slice(okLen);
    return `<span style="color:#10b981">${escape(ok)}</span>${escape(rest)}`;
  }
  function pickWord(diff){
    let pool = WORDS_NORMAL;
    if (diff === "easy") pool = WORDS_EASY;
    if (diff === "hard") pool = WORDS_HARD;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  // ====== 存储 ======
  function loadStorage(els){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const saved = JSON.parse(raw);
      if(saved.name) els.playerName.value = saved.name;
      if(typeof saved.bestScore === "number"){
        state.bestScore = saved.bestScore;
      }
    }catch(err){
      console.warn("[typing-game] loadStorage error:", err);
    }
  }
  function saveStorage(els){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        name: els.playerName.value.trim(),
        bestScore: state.bestScore,
      }));
    }catch(err){
      console.warn("[typing-game] saveStorage error:", err);
    }
  }

  // ====== UI 刷新 ======
  function updateHUD(els){
    els.timeLeft.textContent = state.timeLeft;
    els.score.textContent = state.score;
    els.accuracy.textContent = state.total ? Math.round((state.hits/state.total)*100) + "%" : "100%";
    els.streak.textContent = state.streak;
    els.bestScore.textContent = state.bestScore;
  }
  function setPrompt(els, word){
    state.target = word;
    els.promptText.innerHTML = highlight("", word);
  }

  // ====== 游戏逻辑 ======
  function startGame(els){
    if(state.running) return;
    resetGame(els, false);
    state.running = true;
    state.timeLeft = parseInt(els.duration.value, 10) || 60;
    updateHUD(els);
    setPrompt(els, pickWord(els.difficulty.value));
    els.typingInput.value = "";
    els.typingInput.classList.remove("error","ok");
    els.typingInput.focus();
    tick(els);
  }
  function tick(els){
    state.timerId = setInterval(()=>{
      if(state.paused) return;
      state.timeLeft -= 1;
      els.timeLeft.textContent = state.timeLeft;
      if(state.timeLeft <= 0){
        clearInterval(state.timerId);
        endGame(els);
      }
    }, 1000);
  }
  function endGame(els){
    state.running = false;
    state.paused = false;
    if(state.score > state.bestScore){
      state.bestScore = state.score;
      saveStorage(els);
    }
    addHistoryItem(els);
    updateHUD(els);
  }
  function pauseGame(els){
    if(!state.running) return;
    state.paused = !state.paused;
    els.pauseBtn.textContent = state.paused ? "继续" : "暂停";
  }
  function resetGame(els, stopTimer=true){
    if(stopTimer && state.timerId){ clearInterval(state.timerId); }
    state = {
      running: false,
      paused: false,
      timeLeft: parseInt(els.duration.value,10)||60,
      target: "",
      typed: "",
      score: 0,
      streak: 0,
      hits: 0,
      total: 0,
      bestScore: state.bestScore || 0,
      timerId: null,
    };
    updateHUD(els);
    els.typingInput.value = "";
    els.typingInput.classList.remove("error","ok");
    els.promptText.textContent = "";
    els.pauseBtn.textContent = "暂停";
  }
  function submitWord(els){
    const typed = (els.typingInput.value||"").trim();
    const target = state.target;
    if(!typed) return;
    if(typed === target){
      state.streak += 1;
      const base = Math.max(1, target.length);
      const bonus = Math.min(5, Math.floor(state.streak/3));
      state.score += base + bonus;
      els.typingInput.classList.remove("error");
      els.typingInput.classList.add("ok");
    }else{
      state.streak = 0;
      els.typingInput.classList.remove("ok");
      els.typingInput.classList.add("error");
    }
    els.typingInput.value = "";
    setPrompt(els, pickWord(els.difficulty.value));
    updateHUD(els);
  }
  function addHistoryItem(els){
    const acc = state.total ? Math.round((state.hits/state.total)*100) : 100;
    const li = document.createElement("li");
    li.innerHTML = `
      <span>玩家：${escape(els.playerName.value||"未命名")}</span>
      <span>分数：${state.score}</span>
      <span>准确率：${acc}%</span>
      <span>连击最大：${state.streak}</span>
      <span>用时：${parseInt(els.duration.value,10)}s</span>
    `;
    els.historyList.prepend(li);
  }

  // ====== DOM 就绪：defer 足够，但再保险一层 ======
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
