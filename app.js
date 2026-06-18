// Constants and Variables
const ichingUrl = './open-iching-main/iching/iching.json';
let ichingData = [];
let currentLines = []; // Array of integers: 6, 7, 8, 9

// DOM Elements
const castBtn = document.getElementById('cast-btn');
const resetBtn = document.getElementById('reset-btn');
const coinArea = document.getElementById('coin-area');
const coins = document.querySelectorAll('.coin');
const hexagramContainer = document.getElementById('hexagram-container');
const instruction = document.getElementById('instruction');
const resultArea = document.getElementById('result-area');
const copyPromptBtn = document.getElementById('copy-prompt-btn');

// Initialize
async function init() {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js').catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    try {
        const response = await fetch(ichingUrl);
        ichingData = await response.json();
    } catch (error) {
        console.error('Failed to load iching data:', error);
        instruction.innerHTML = '加载数据失败，请确保您在使用本地服务器运行此应用。';
    }
}

// Handle Cast Button
castBtn.addEventListener('click', () => {
    if (currentLines.length >= 6) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
    }
    
    // Disable button during animation
    castBtn.disabled = true;
    coinArea.classList.remove('hidden');
    
    // Add flipping class
    coins.forEach(coin => coin.classList.add('flipping'));
    
    setTimeout(() => {
        coins.forEach(coin => coin.classList.remove('flipping'));
        coinArea.classList.add('hidden');
        castBtn.disabled = false;
        
        handleCast();
    }, 1000);
});

// Question UI Logic
const questionInput = document.getElementById('question-input');
const chips = document.querySelectorAll('.chip');

chips.forEach(chip => {
    chip.addEventListener('click', () => {
        questionInput.value = chip.innerText;
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });
});

// Generate entropy-based coin toss (2 or 3)
function tossCoin() {
    const entropy = Date.now() ^ Math.floor(Math.random() * 1000000);
    // Use bitwise operations to extract a pseudo-random bit
    return (entropy & 1) === 0 ? 2 : 3;
}

function castLine() {
    const coin1 = tossCoin();
    const coin2 = tossCoin();
    const coin3 = tossCoin();
    return coin1 + coin2 + coin3;
}

function drawLine(value) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'yao-line';
    
    // 6: Old Yin, 7: Young Yang, 8: Young Yin, 9: Old Yang
    const isYang = value === 7 || value === 9;
    const isMoving = value === 6 || value === 9;

    if (isYang) {
        // Solid line
        const seg = document.createElement('div');
        seg.className = 'yao-segment yao-solid';
        lineDiv.appendChild(seg);
    } else {
        // Broken line
        const seg1 = document.createElement('div');
        seg1.className = 'yao-segment yao-broken';
        const seg2 = document.createElement('div');
        seg2.className = 'yao-segment yao-broken';
        lineDiv.appendChild(seg1);
        lineDiv.appendChild(seg2);
    }

    if (isMoving) {
        const indicator = document.createElement('div');
        indicator.className = 'moving-indicator';
        indicator.innerText = value === 6 ? '✕' : '◯';
        lineDiv.appendChild(indicator);
    }

    hexagramContainer.appendChild(lineDiv);
}

function getHexagramByArray(arr) {
    return ichingData.find(hex => {
        for (let i = 0; i < 6; i++) {
            if (hex.array[i] !== arr[i]) return false;
        }
        return true;
    });
}

function processResult() {
    // Determine Original Hexagram Array (0/1)
    // 6: Yin(0), 7: Yang(1), 8: Yin(0), 9: Yang(1)
    const origArray = currentLines.map(v => (v === 7 || v === 9) ? 1 : 0);
    const origHex = getHexagramByArray(origArray);

    // Determine if there are moving lines
    const movingIndices = [];
    currentLines.forEach((v, index) => {
        if (v === 6 || v === 9) movingIndices.push(index);
    });

    // Populate Original Hexagram UI
    document.getElementById('orig-name').innerText = `本卦：${origHex.name}`;
    document.getElementById('orig-symbol').innerText = origHex.symbol;
    document.getElementById('orig-scripture').innerText = origHex.scripture;

    // Moving Lines details
    const movingLinesArea = document.getElementById('moving-lines-area');
    const movingLinesList = document.getElementById('moving-lines-list');
    movingLinesList.innerHTML = '';
    
    let changedHex = null;

    if (movingIndices.length > 0) {
        movingLinesArea.classList.remove('hidden');
        document.getElementById('change-arrow').classList.remove('hidden');
        document.getElementById('changed-hex-container').classList.remove('hidden');

        // Populate Moving Lines
        movingIndices.forEach(idx => {
            const lineData = origHex.lines[idx];
            const li = document.createElement('li');
            li.innerHTML = `<strong>${lineData.name}：</strong>${lineData.scripture}`;
            movingLinesList.appendChild(li);
        });

        // Determine Changed Hexagram Array
        const changedArray = [...origArray];
        movingIndices.forEach(idx => {
            changedArray[idx] = changedArray[idx] === 1 ? 0 : 1;
        });
        changedHex = getHexagramByArray(changedArray);

        document.getElementById('changed-name').innerText = `之卦：${changedHex.name}`;
        document.getElementById('changed-symbol').innerText = changedHex.symbol;
        document.getElementById('changed-scripture').innerText = changedHex.scripture;
    } else {
        movingLinesArea.classList.add('hidden');
        document.getElementById('change-arrow').classList.add('hidden');
        document.getElementById('changed-hex-container').classList.add('hidden');
    }

    resultArea.classList.remove('hidden');
    
    // Setup Local Interpretation
    setupLocalInterpretation(origHex, changedHex, movingIndices);
    
    // Setup AI Prompt
    setupCopyPrompt(origHex, changedHex, movingIndices);
    
    // Save to history
    saveHistory(origHex, changedHex, movingIndices);
    
    // Auto scroll to results
    setTimeout(() => {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function setupLocalInterpretation(origHex, changedHex, movingIndices) {
    currentPosterData = { origHex, changedHex, movingIndices };
    
    const aiContent = document.getElementById('ai-interpretation-content');
    const userQuestion = questionInput.value.trim() || '此事';
    
    let html = `<div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                    <p style="margin-bottom:0; font-size:1.05rem;"><strong>关于【${userQuestion}】的运势：</strong></p>
                    <button id="audio-read-btn" style="background:none; border:1px solid var(--accent-color); color:var(--accent-color); border-radius:20px; padding:4px 10px; font-size:0.8rem; cursor:pointer;">🔊 语音解读</button>
                </div>`;
    
    const origData = hexagramInterpretations[origHex.name] || { general: '暂无解析', career: '暂无解析', love: '暂无解析' };
    
    html += `<div style="margin-bottom:15px; padding:10px; background:#f5f5f0; border-radius:5px;">
                <p style="margin-bottom:8px; color:var(--accent-color);"><strong>【本卦 - ${origHex.name}】综合运势：</strong></p>
                <p>${origData.general}</p>
             </div>`;
             
    html += `<div style="margin-bottom:15px; display:flex; gap:10px;">
                <div style="flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;">
                    <p style="color:#555; font-weight:bold; margin-bottom:5px;">💼 事业财运</p>
                    <p style="font-size:0.9rem;">${origData.career}</p>
                </div>
                <div style="flex:1; padding:10px; border:1px solid #ddd; border-radius:5px;">
                    <p style="color:#555; font-weight:bold; margin-bottom:5px;">❤️ 感情婚姻</p>
                    <p style="font-size:0.9rem;">${origData.love}</p>
                </div>
             </div>`;

    if (movingIndices.length > 0) {
        html += `<p style="color:var(--accent-color); font-weight:bold; margin: 15px 0 5px;">【变数与指引 - 动爻辞】</p>`;
        html += `<ul style="list-style:none; margin-bottom:15px; padding-left:0;">`;
        movingIndices.forEach(idx => {
            const yaoLine = origHex.lines ? origHex.lines[idx] : null;
            if (yaoLine) {
                html += `<li style="margin-bottom:8px; padding:8px; background:#fff; border-left:3px solid #666; font-size:0.9rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">${yaoLine.scripture}</li>`;
            }
        });
        html += `</ul>`;
        
        const changedData = hexagramInterpretations[changedHex.name] || { general: '暂无解析' };
        html += `<div style="padding:10px; border-top:1px dashed #ccc;">
                    <p style="margin-bottom:8px; color:#666;"><strong>【之卦 - ${changedHex.name}】最终走向参考：</strong></p>
                    <p style="font-size:0.9rem; color:#555;">${changedData.general}</p>
                 </div>`;
    } else {
        html += `<p style="color:#666; font-size: 0.85rem; text-align:center; margin-top:15px;"><em>(注：此为六爻纯静之卦，说明目前局势相对稳定，没有大的变数，顺其自然即可。)</em></p>`;
    }
    
    aiContent.innerHTML = html;
    
    const audioBtn = document.getElementById('audio-read-btn');
    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            if (!window.speechSynthesis) {
                alert('您的浏览器不支持语音播报');
                return;
            }
            window.speechSynthesis.cancel();
            const textToRead = `关于${userQuestion}的运势解析。本卦，${origHex.name}。综合运势：${origData.general}。事业财运：${origData.career}。感情婚姻：${origData.love}。`;
            const utterThis = new SpeechSynthesisUtterance(textToRead);
            utterThis.lang = 'zh-CN';
            utterThis.rate = 0.95;
            utterThis.pitch = 0.8;
            window.speechSynthesis.speak(utterThis);
        });
    }
}

const baziDate = document.getElementById('bazi-date');
const baziTime = document.getElementById('bazi-time');

function setupCopyPrompt(origHex, changedHex, movingIndices) {
    const userQuestion = questionInput.value.trim() || '某事';
    let prompt = `你现在是一位非常有经验老道的易学师父（解签人）。我用掌中易刚刚起了一卦，心中所求之事是【${userQuestion}】。\n\n`;
    
    if (baziDate && baziDate.value) {
        try {
            const [y, m, d] = baziDate.value.split('-');
            let h = 12, min = 0;
            if (baziTime && baziTime.value) {
                const parts = baziTime.value.split(':');
                h = parseInt(parts[0]);
                min = parseInt(parts[1]);
            }
            if (window.Solar && window.Lunar) {
                const solar = window.Solar.fromYmdHms(parseInt(y), parseInt(m), parseInt(d), h, min, 0);
                const lunar = solar.getLunar();
                const baziStr = lunar.getBaZi().join(' ');
                prompt += `特别提醒：我的生辰八字是【${baziStr}】。请你在解卦时，务必结合我的八字五行生克，给出针对我个人的深度解析。\n\n`;
            }
        } catch (e) {
            console.error('Bazi error:', e);
        }
    }
    
    prompt += `我得到的本卦是《${origHex.name}》卦，卦辞是：“${origHex.scripture}”。\n`;
    
    if (movingIndices.length > 0) {
        prompt += `其中有 ${movingIndices.length} 个动爻，分别是：\n`;
        movingIndices.forEach(idx => {
            prompt += `- ${origHex.lines[idx].name}：“${origHex.lines[idx].scripture}”\n`;
        });
        prompt += `\n因为有动爻，所以变出了之卦《${changedHex.name}》卦，卦辞是：“${changedHex.scripture}”。\n\n`;
        prompt += `请结合本卦、动爻和之卦的含意，用通俗易懂的白话文，帮我深度解析这一卦的吉凶以及对我的启示，并给我一些具体的建议。`;
    } else {
        prompt += `\n这一卦没有动爻（六爻静）。\n\n`;
        prompt += `请结合《${origHex.name}》卦的卦象和卦辞含意，用通俗易懂的白话文，帮我深度解析这一卦的吉凶以及对我的启示，并给我一些具体的建议。`;
    }

    copyPromptBtn.onclick = () => {
        navigator.clipboard.writeText(prompt).then(() => {
            const originalText = copyPromptBtn.innerText;
            copyPromptBtn.innerText = '复制成功！请发给AI大师';
            copyPromptBtn.style.backgroundColor = '#8B0000';
            copyPromptBtn.style.color = '#fff';
            setTimeout(() => {
                copyPromptBtn.innerText = originalText;
                copyPromptBtn.style.backgroundColor = '#fff';
                copyPromptBtn.style.color = '#8B0000';
            }, 3000);
        }).catch(err => {
            alert('复制失败，请手动选择复制');
            console.error('Failed to copy text: ', err);
        });
    };
}

function handleCast() {
    const val = castLine();
    currentLines.push(val);
    drawLine(val);

    castBtn.innerText = `起卦 (${currentLines.length}/6)`;

    if (currentLines.length === 6) {
        castBtn.classList.add('hidden');
        processResult();
    }
}

function resetApp() {
    currentLines = [];
    hexagramContainer.innerHTML = '<div class="placeholder-text" id="instruction">请静心默念所求之事<br>点击下方按钮起卦</div>';
    resultArea.classList.add('hidden');
    castBtn.classList.remove('hidden');
    castBtn.innerText = '起卦 (0/6)';
    
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

resetBtn.addEventListener('click', resetApp);

// History Modal Logic
const historyBtn = document.getElementById('history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const generatePosterBtn = document.getElementById('generate-poster-btn');
const posterTemplate = document.getElementById('poster-template');
const posterQuestion = document.getElementById('poster-question');
const posterHexSymbol = document.getElementById('poster-hex-symbol');
const posterHexName = document.getElementById('poster-hex-name');
const posterInterpretation = document.getElementById('poster-interpretation');

// State
let currentPosterData = null;

function getHistory() {
    return JSON.parse(localStorage.getItem('divination_history') || '[]');
}

function saveHistory(origHex, changedHex, movingIndices) {
    const userQuestion = questionInput.value.trim() || '某事';
    const history = getHistory();
    const newEntry = {
        date: new Date().toLocaleString(),
        question: userQuestion,
        origHexName: origHex.name,
        changedHexName: changedHex ? changedHex.name : null,
        moving: movingIndices.length > 0
    };
    history.unshift(newEntry);
    localStorage.setItem('divination_history', JSON.stringify(history));
}

function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">暂无排盘记录</p>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-date">${item.date}</div>
            <div class="history-question">所求：${item.question}</div>
            <div class="history-hex">
                本卦：${item.origHexName} 
                ${item.moving ? `→ 之卦：${item.changedHexName}` : '(无动爻静卦)'}
            </div>
        </div>
    `).join('');
}

historyBtn.addEventListener('click', () => {
    renderHistory();
    historyModal.classList.remove('hidden');
});

closeHistoryBtn.addEventListener('click', () => {
    historyModal.classList.add('hidden');
});

clearHistoryBtn.addEventListener('click', () => {
    if(confirm('确定要清除所有历史记录吗？')) {
        localStorage.removeItem('divination_history');
        renderHistory();
    }
});

// Poster Generation Logic
async function generatePoster() {
    if (!currentPosterData || !window.html2canvas) {
        alert('功能加载中，请稍后再试...');
        return;
    }
    
    const { origHex, changedHex, movingIndices } = currentPosterData;
    const userQuestion = questionInput.value.trim() || '某事';
    
    posterQuestion.innerText = `所求之事：${userQuestion}`;
    posterHexSymbol.innerText = origHex.symbol;
    posterHexName.innerText = origHex.name;
    
    const origData = hexagramInterpretations[origHex.name] || { general: '暂无解析' };
    let interpHTML = `<p style="margin-bottom:10px;"><strong>【核心解析】</strong><br>${origData.general}</p>`;
    
    if (movingIndices.length > 0) {
        interpHTML += `<p><strong>【变数提示】</strong><br>此卦有动爻，说明事情还在发展变化中，未来走向请参考之卦《${changedHex.name}》</p>`;
    } else {
        interpHTML += `<p><strong>【状态提示】</strong><br>此卦为纯静之卦，局势稳定，顺其自然即可。</p>`;
    }
    
    posterInterpretation.innerHTML = interpHTML;
    
    // Temporarily show the template for rendering
    posterTemplate.classList.remove('hidden');
    
    try {
        const originalBtnText = generatePosterBtn.innerText;
        generatePosterBtn.innerText = '正在生成海报...';
        generatePosterBtn.disabled = true;
        
        const canvas = await html2canvas(posterTemplate, {
            scale: 2, // High resolution
            useCORS: true,
            backgroundColor: null
        });
        
        const link = document.createElement('a');
        link.download = `掌中易-${origHex.name}卦-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        generatePosterBtn.innerText = originalBtnText;
        generatePosterBtn.disabled = false;
    } catch (e) {
        console.error("Poster generation failed", e);
        alert('生成海报失败，请稍后再试');
        generatePosterBtn.innerText = '📸 生成专属运势海报';
        generatePosterBtn.disabled = false;
    } finally {
        posterTemplate.classList.add('hidden');
    }
}

if (generatePosterBtn) {
    generatePosterBtn.addEventListener('click', generatePoster);
}

// Daily Draw / Fast Cast Logic
const dailyDrawBtn = document.getElementById('daily-draw-btn');

if (dailyDrawBtn) {
    dailyDrawBtn.addEventListener('click', () => {
        resetApp();
        
        // Auto-cast 6 times instantly
        for(let i=0; i<6; i++) {
            const rand = Math.random();
            // Bias slightly to static lines (7, 8) to avoid too many moving lines
            let val;
            if (rand < 0.1) val = 6;
            else if (rand < 0.5) val = 7;
            else if (rand < 0.9) val = 8;
            else val = 9;
            
            currentLines.push(val);
            drawLine(val);
        }
        
        questionInput.value = "今日运势";
        instruction.classList.add('hidden');
        
        castBtn.innerText = '起卦 (6/6)';
        castBtn.classList.add('hidden');
        
        processResult();
    });
}

// Title Refresh Logic
const appTitle = document.getElementById('app-title');
if (appTitle) {
    appTitle.addEventListener('click', () => {
        location.reload();
    });
}

// Run init
init();
