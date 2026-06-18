// Constants and Variables
const ichingUrl = './open-iching-main/iching/iching.json';
let ichingData = [];
let currentLines = []; // Array of integers: 6, 7, 8, 9

// DOM Elements
const castBtn = document.getElementById('cast-btn');
const resetBtn = document.getElementById('reset-btn');
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
    
    // Setup AI Prompt
    setupCopyPrompt(origHex, changedHex, movingIndices);
    
    // Auto scroll to results
    setTimeout(() => {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function setupCopyPrompt(origHex, changedHex, movingIndices) {
    const userQuestion = questionInput.value.trim() || '某事';
    let prompt = `你现在是一位非常有经验老道的易学师父（解签人）。我用掌中易刚刚起了一卦，心中所求之事是【${userQuestion}】。\n\n`;
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
    if (currentLines.length >= 6) return;

    instruction.classList.add('hidden');
    
    const value = castLine();
    currentLines.push(value);
    drawLine(value);

    castBtn.innerText = `起卦 (${currentLines.length}/6)`;

    if (currentLines.length === 6) {
        castBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
        processResult();
    }
}

function resetApp() {
    currentLines = [];
    hexagramContainer.innerHTML = '<div class="placeholder-text" id="instruction">请静心默念所求之事<br>点击下方按钮起卦</div>';
    resultArea.classList.add('hidden');
    castBtn.classList.remove('hidden');
    resetBtn.classList.add('hidden');
    castBtn.innerText = '起卦 (0/6)';
    
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Event Listeners
castBtn.addEventListener('click', handleCast);
resetBtn.addEventListener('click', resetApp);

// Run init
init();
