main();
var threshold=50;
var pca9865;
var close = false;

async function main() {
  var head = document.getElementById("head");
  var i2cAccess = await navigator.requestI2CAccess();
  var port = i2cAccess.ports.get(1);
  pca9685 = new PCA9685(port, 0x40);
  var angle = 0;
  // console.log("angle"+angle);
  // servo setting for sg90
  // Servo PWM pulse: min=0.0011[sec], max=0.0019[sec] angle=+-60[deg]
  await pca9685.init(0.001, 0.002, 30);
  /* for (;;) {
    angle = angle <= -30 ? 30 : -30;
    // console.log("angle"+angle);
    await pca9685.setServo(0, angle);
    await pca9685.setServo(1, angle);
    // console.log('value:', angle);
    head.innerHTML = angle;
    await sleep(1000);
  } */
}

window.onload = function() {
  document.body.onclick = init
}
const init = async function() {
  document.body.onclick = null

  let fftsize = 15
  if (document.location.hash.length > 1) {
    fftsize = parseInt(document.location.hash.substring(1))
  }
  if (fftsize < 5) {
    fftsize = 5
  } else if (fftsize > 15) {
    fftsize = 15
  }

  if (!navigator.mediaDevices.getUserMedia) {
    alert('getUserMedia not supported')
    return
  }
  const audio = new (window.AudioContext || window.webkitAudioContext)()
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const source = audio.createMediaStreamSource(stream)
  const analyser = audio.createAnalyser() // FFT
  //analyser.minDecibels = -90
  //analyser.maxDecibels = -10
  analyser.smoothingTimeConstant = 0 // 0-.999 0.85 ふわっとなる
  analyser.fftSize = 1 << fftsize // min:32==1<<5 max:32768==1<<15
  source.connect(analyser)

  console.log(audio.sampleRate) // 44100 固定?
  console.log(audio.sampleRate / analyser.fftSize + "Hz") // 分解能

  const buflen = analyser.frequencyBinCount
  const buf = new Uint8Array(buflen)

  var text = document.getElementById("peak");
  const draw = function() {
    analyser.getByteFrequencyData(buf)
    var peak = [0,0];
    for (let i = 0; i < buflen; i++) {
      const n = buf[i]
      if (peak[0] < n) {
        peak[0] = n;
        peak[1] = i;
      }
    }
    text.innerHTML = Math.round(peak[1] * audio.sampleRate / analyser.fftSize) + "Hz<br />大きさ:" + ( '000' + peak[0] ).slice( -3 ) + " " + threshold;
    if((peak[1] * audio.sampleRate / analyser.fftSize) < 500 && (peak[1] * audio.sampleRate / analyser.fftSize) > 400) { 
      if (!close) {
        threshold++; 
      } else {
        threshold=0;
      }
    } else if((peak[1] * audio.sampleRate / analyser.fftSize) >= 500 || (peak[1] * audio.sampleRate / analyser.fftSize) <= 400) { 
      if (close) {
        threshold++; 
      } else {
        threshold=0;
      }
    }
    if(threshold >= 150) {
      if (!close) {
        pca9685.setServo(0, 30);
        pca9685.setServo(1, 30);
        console.log("moved!");
      } else {
        pca9685.setServo(0, 0);
        pca9685.setServo(1, 0);
        console.log("moved!");
      }
      close = !close;
      threshold = 0;
    }
    requestAnimationFrame(draw);
  }
  draw()
}