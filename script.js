/* ========== FILE: script.js ========== */
(function(){
// Basic game state saved in localStorage for the team browser
const GAME_KEY = 'xiss_treasure_state_v1';
const defaultState = {currentQ:1, score:0, startedAt:Date.now(), timeLeft:60*60}; // 60 min default


function loadState(){
try{const s=JSON.parse(localStorage.getItem(GAME_KEY)); return s? s: defaultState}catch(e){return defaultState}
}
function saveState(s){localStorage.setItem(GAME_KEY, JSON.stringify(s))}


const state = loadState();


// Timer update on pages that have element with id timer
function startTimer(){
const el = document.getElementById('timer');
if(!el) return;
function tick(){
const now = Date.now();
const elapsed = Math.floor((now - state.startedAt)/1000);
const remain = Math.max(0, state.timeLeft - elapsed);
const mm = String(Math.floor(remain/60)).padStart(2,'0');
const ss = String(remain%60).padStart(2,'0');
el.textContent = mm + ':' + ss;
if(remain<=0) clearInterval(ti);
}
tick();
const ti = setInterval(tick,1000);
}
startTimer();


// Show score if element #score exists
const scoreEl = document.getElementById('score');
if(scoreEl) scoreEl.textContent = state.score;


// Open scanner from question pages - opens scanner.html in same tab
const openScannerBtn = document.getElementById('openScanner');
if(openScannerBtn){
openScannerBtn.addEventListener('click', ()=>{
const qTitle = document.title.match(/Question ([0-9]+)/i);
const q = qTitle ? qTitle[1] : state.currentQ;
window.location.href = 'scanner.html?from=q' + q;
});
}
// Manual code submit handler (example for q1-ans.html)
const submitCodeBtn = document.getElementById('submitCode');
if(submitCodeBtn){
submitCodeBtn.addEventListener('click', ()=>{
const code = document.getElementById('codeInput').value.trim();
const result = document.getElementById('result');
if(!code){ result.textContent = 'Please enter a code.'; return; }
// For demo we expect codes like Q1-CODE-XYZ. In production use organizer generated tokens.
if(/^Q[0-9]+-/.test(code.toUpperCase())){
result.textContent = 'Code accepted — moving to next question.';
state.score += 10; state.currentQ = Math.min(12, state.currentQ + 1); saveState(state);
setTimeout(()=>{ const next = 'q' + state.currentQ + '.html'; window.location.href = next; }, 900);
} else {
result.textContent = 'Invalid code. Make sure you scanned the correct QR.';
}
});
}
//*** */
let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let scanning = false;
let stream;

// START CAMERA
document.getElementById("startCam").onclick = async function () {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
        });

        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        await video.play();

        scanning = true;
        scanFrame();
    } catch (err) {
        alert("Camera access denied or unavailable: " + err);
    }
};

// SCAN LOOP
function scanFrame() {
    if (!scanning) return;

    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let code = jsQR(imgData.data, imgData.width, imgData.height);
    if (code) {
        scanning = false;

        // STOP CAMERA
        stream.getTracks().forEach(t => t.stop());

        // SHOW SCAN RESULT
        document.getElementById("scanResult").innerText = "Scanned: " + code.data;

        // REDIRECT to next question
        window.location.href = code.data;
        return;
    }

    requestAnimationFrame(scanFrame);
}


// Scanner page logic
if(window.location.pathname.endsWith('scanner.html')){
const startCam = document.getElementById('startCam');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const fileInput = document.getElementById('fileInput');
const scanResult = document.getElementById('scanResult');


function closeAndPass(text){
scanResult.textContent = 'Scanned: ' + text;
try{
const upper = text.toUpperCase();
const m = upper.match(/Q([0-9]+)/);
if(m){
const qn = parseInt(m[1]);
state.currentQ = Math.min(12, qn + 1); state.score += 10; saveState(state);
setTimeout(()=>{ window.location.href = 'q' + state.currentQ + '.html'; }, 800);
} else {
scanResult.textContent += ' — but format not recognized. Ask organizer.';
}
}catch(e){ console.error(e); }
}
async function startDetector(){
if('BarcodeDetector' in window){
const supported = await BarcodeDetector.getSupportedFormats().catch(()=>[]);
const detector = new BarcodeDetector({formats: supported});
try{
const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
video.srcObject = stream; video.play();
const ctx = canvas.getContext('2d');
canvas.width = 640; canvas.height = 480;
const loop = async ()=>{
if(video.readyState === video.HAVE_ENOUGH_DATA){
ctx.drawImage(video,0,0,canvas.width,canvas.height);
try{
const barcodes = await detector.detect(canvas);
if(barcodes && barcodes.length){
closeAndPass(barcodes[0].rawValue || barcodes[0].rawText || JSON.stringify(barcodes[0]));
stream.getTracks().forEach(t=>t.stop());
return;
}
}catch(e){ }
}
requestAnimationFrame(loop);
};
loop();
}catch(e){ scanResult.textContent = 'Could not open camera. Please allow camera or use file upload.' }
} else {
scanResult.textContent = 'BarcodeDetector not available — use file upload.';
}
}
startCam.addEventListener('click', startDetector);


fileInput.addEventListener('change', ()=>{
const f = fileInput.files[0]; if(!f) return;
const reader = new FileReader();
reader.onload = function(){
const img = new Image(); img.onload = function(){
if('BarcodeDetector' in window){
canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0);
const detector = new BarcodeDetector();
detector.detect(canvas).then(list=>{
if(list && list.length){ closeAndPass(list[0].rawValue||list[0].rawText); }
else scanResult.textContent = 'No barcode detected in image.';
}).catch(()=>{ scanResult.textContent = 'No detector available.' });
} else {
scanResult.textContent = 'Upload received. If it contains the QR text, paste it into the textbox on the question page.';
}
}; img.src = reader.result;
};
reader.readAsDataURL(f);
});
}

//close button
document.getElementById("closeBtn").addEventListener("click", function (e) {
    e.preventDefault();

    // Stop camera safely
    try {
        if (window.stream) {
            window.stream.getTracks().forEach(t => t.stop());
        }
    } catch (err) {}

    // Read ?from=qX from the URL
    const params = new URLSearchParams(window.location.search);
    let page = params.get("from");

    // If parameter missing → do nothing except return to index
    if (!page) page = "index";

    // Ensure .html extension
    if (!page.endsWith(".html")) page += ".html";

    // Redirect back to the right question page
    window.location.href = page;
});


})();

