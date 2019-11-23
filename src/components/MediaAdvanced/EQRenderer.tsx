import { EQTag } from "../../types";

//eslint-disable-next-line
export function displayCanvasMsg(instance: any) {
    let size = 20 * instance.pixelRatio;
    if (instance.isFullscreen) size *= 2;
    instance.canvasCtx.font = `${size}px Magra,sans-serif`;
    const w = instance.canvasCtx.measureText('audioMotion').width / 2;

    instance.canvasCtx.font = `${size + instance.dataArray[1] / 16 * instance.pixelRatio}px Magra,sans-serif`;
    instance.canvasCtx.fillStyle = '#fff8';
    instance.canvasCtx.textAlign = 'center';
    instance.canvasCtx.fillText('audioMotion', instance.canvas.width - w - size * 4, size * 2);
}

const curveColor = "rgb(224,27,106)";
const gridColor = "rgb(100,100,100)";

const dbScale = 60;
let pixelsPerDb = 1;
let width = 0;
let height = 0;

function dbToY(db: number) {
    const y = (0.5 * height) - pixelsPerDb * db;
    return y;
}

const drawCurve = (
    canvas: HTMLCanvasElement,
    canvasContext: CanvasRenderingContext2D,
    context: AudioContext,

) => {
    // draw center
    width = canvas.width;
    height = canvas.height;

    //canvasContext.clearRect(0, 0, width, height);

    canvasContext.strokeStyle = curveColor;
    canvasContext.lineWidth = 3;
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0);

    pixelsPerDb = (0.5 * height) / dbScale;

    const noctaves = 11;

    const frequencyHz = new Float32Array(width);
    const magResponse = new Float32Array(width);
    //let phaseResponse = new Float32Array(width);
    const nyquist = 0.5 * context.sampleRate;
    // First get response.
    for (let i = 0; i < width; i += 1) {
        let f = i / width;

        // Convert to log frequency scale (octaves).
        f = nyquist * (2.0 ** noctaves * (f - 1.0));

        frequencyHz[i] = f;
    }

    //filter.getFrequencyResponse(frequencyHz, magResponse, phaseResponse);


    for (let i = 0; i < width; i += 1) {
        //let f = magResponse[i];
        const response = magResponse[i];
        const dbResponse = 20.0 * Math.log(response) / Math.LN10;

        const x = i;
        const y = dbToY(dbResponse);

        if (i === 0) canvasContext.moveTo(x, y);
        else canvasContext.lineTo(x, y);
    }
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.lineWidth = 1;
    canvasContext.strokeStyle = gridColor;

    // Draw 0dB line.
    canvasContext.beginPath();
    canvasContext.moveTo(0, 0.5 * height);
    canvasContext.lineTo(width, 0.5 * height);
    canvasContext.stroke();
}

//eslint-disable-next-line
export function drawEQTags(instance: any, tags: EQTag[]) {
    tags = tags.filter(tag => tag.type !== 'edit');
    for (let i = 0; i < tags.length; i += 1) {
        //const filter = tags[i].type;
        //const freq = tags[i].freq;
        //const resonance = tags[i].q;
        //sconst gain = tags[i].gain;

        const canvasCtx = instance.canvasCtx;
        const audioCtx = instance.audioCtx;

        drawCurve(instance.canvas, canvasCtx, audioCtx)
    }
}
