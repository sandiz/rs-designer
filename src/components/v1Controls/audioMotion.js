/* eslint-disable */
/**
 * audioMotion.js
 * A real-time graphic spectrum analyzer and audio player using Web Audio and Canvas APIs
 *
 * https://github.com/hvianna/audioMotion.js
 *
 * Copyright (C) 2018-2019 Henrique Vianna <hvianna@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */



/**
 * Global variables
 */
var
    audioStarted = false,
    elMode,
    cfgShowPeaks, cfgBlackBg,
    // data for drawing the analyzer bars and scale related variables
    analyzerBars, fMin, fMax, deltaX, bandWidth, barWidth,
    // Web Audio API related variables
    audioCtx, analyzer, bufferLength, dataArray,
    // canvas related variables
    canvas, canvasCtx, pixelRatio,
    // gradient definitions
    gradients = {
        aurora: {
            name: 'Aurora', bgColor: '#0e172a', colorStops: [
                { stop: .1, color: 'hsl( 120, 100%, 50% )' },
                { stop: 1, color: 'hsl( 216, 100%, 50% )' }
            ]
        },
        borealis: {
            name: 'Borealis', bgColor: '#0d1526', colorStops: [
                { stop: .1, color: 'hsl( 120, 100%, 50% )' },
                { stop: .5, color: 'hsl( 189, 100%, 40% )' },
                { stop: 1, color: 'hsl( 290, 60%, 40% )' }
            ]
        },
        candy: {
            name: 'Candy', bgColor: '#0d0619', colorStops: [
                { stop: .1, color: '#ffaf7b' },
                { stop: .5, color: '#d76d77' },
                { stop: 1, color: '#3a1c71' }
            ]
        },
        classic: {
            name: 'Classic', bgColor: '#111', colorStops: [
                { stop: .1, color: 'hsl( 0, 100%, 50% )' },
                { stop: .6, color: 'hsl( 60, 100%, 50% )' },
                { stop: 1, color: 'hsl( 120, 100%, 50% )' }
            ]
        },
        dusk: {
            name: 'Dusk', bgColor: '#0e172a', colorStops: [
                { stop: .2, color: 'hsl( 55, 100%, 50% )' },
                { stop: 1, color: 'hsl( 16, 100%, 50% )' }
            ]
        },
        miami: {
            name: 'Miami', bgColor: '#111', colorStops: [
                { stop: .024, color: 'rgb( 251, 198, 6 )' },
                { stop: .283, color: 'rgb( 224, 82, 95 )' },
                { stop: .462, color: 'rgb( 194, 78, 154 )' },
                { stop: .794, color: 'rgb( 32, 173, 190 )' },
                { stop: 1, color: 'rgb( 22, 158, 95 )' }
            ]
        },
        outrun: {
            name: 'Outrun', bgColor: '#111', colorStops: [
                { stop: 0, color: 'rgb( 255, 223, 67 )' },
                { stop: .182, color: 'rgb( 250, 84, 118 )' },
                { stop: .364, color: 'rgb( 198, 59, 243 )' },
                { stop: .525, color: 'rgb( 133, 80, 255 )' },
                { stop: .688, color: 'rgb( 74, 104, 247 )' },
                { stop: 1, color: 'rgb( 35, 210, 255 )' }
            ]
        },
        pacific: {
            name: 'Pacific Dream', bgColor: '#051319', colorStops: [
                { stop: .1, color: '#34e89e' },
                { stop: 1, color: '#0f3443' }
            ]
        },
        prism: { name: 'Prism', bgColor: '#111' },
        rainbow: { name: 'Rainbow', bgColor: '#111' },
        shahabi: {
            name: 'Shahabi', bgColor: '#060613', colorStops: [
                { stop: .1, color: '#66ff00' },
                { stop: 1, color: '#a80077' }
            ]
        },
        summer: {
            name: 'Summer', bgColor: '#041919', colorStops: [
                { stop: .1, color: '#fdbb2d' },
                { stop: 1, color: '#22c1c3' }
            ]
        },
        sunset: {
            name: 'Sunset', bgColor: '#021119', colorStops: [
                { stop: .1, color: '#f56217' },
                { stop: 1, color: '#0b486b' }
            ]
        },
        tiedye: {
            name: 'Tie Dye', bgColor: '#111', colorStops: [
                { stop: .038, color: 'rgb( 15, 209, 165 )' },
                { stop: .208, color: 'rgb( 15, 157, 209 )' },
                { stop: .519, color: 'rgb( 133, 13, 230 )' },
                { stop: .731, color: 'rgb( 230, 13, 202 )' },
                { stop: .941, color: 'rgb( 242, 180, 107 )' }
            ]
        },
    };

/**
 * Configuration presets
 */
var presets = {
    fullres: {
        mode: 0,	    // discrete frequencies mode
        fftSize: 8192,		// FFT size
        freqMin: 20,		// lowest frequency
        freqMax: 22000,	// highest frequency
        smoothing: 0.5		// 0 to 0.9 - smoothing time constant
    },

    octave: {
        mode: 4,		// 1/6th octave bands mode
        fftSize: 8192,
        freqMin: 30,
        freqMax: 16000,
        smoothing: 0.5
    }
};


/**
 * Pre-calculate the actual X-coordinate on screen for each analyzer bar
 */
function preCalcPosX() {

    fMin = 32;
    fMax = 16000;

    var i, freq;

    deltaX = Math.log10(fMin);
    bandWidth = canvas.width / (Math.log10(fMax) - deltaX);

    analyzerBars = [];


    // octave bands
    // generate a table of frequencies based on the equal tempered scale
    var root24 = 2 ** (1 / 12); // for 1/24th-octave bands
    var c0 = 440 * root24 ** -114;
    var temperedScale = [];
    var prevBin = 0;

    i = 0;
    while ((freq = c0 * root24 ** i) <= fMax) {
        if (freq >= fMin && i % elMode == 0)
            temperedScale.push(freq);
        i++;
    }
    // canvas space will be divided by the number of frequencies we have to display
    barWidth = Math.floor(canvas.width / temperedScale.length) - 1;
    var barSpace = Math.round(canvas.width - barWidth * temperedScale.length) / (temperedScale.length - 1);

    temperedScale.forEach(function (freq, index) {
        // which FFT bin represents this frequency?
        var bin = Math.round(freq * analyzer.fftSize / audioCtx.sampleRate);

        var idx, nextBin, avg = false;
        // start from the last used FFT bin
        if (prevBin > 0 && prevBin + 1 <= bin)
            idx = prevBin + 1;
        else
            idx = bin;

        prevBin = nextBin = bin;
        // check if there's another band after this one
        if (temperedScale[index + 1] !== undefined) {
            nextBin = Math.round(temperedScale[index + 1] * analyzer.fftSize / audioCtx.sampleRate);
            // and use half the bins in between for this band
            if (nextBin - bin > 1)
                prevBin += Math.round((nextBin - bin) / 2);
            else if (nextBin - bin == 1) {
                // for low frequencies the FFT may not provide as many coefficients as we need, so more than one band will use the same FFT data
                // in these cases, we set a flag to perform an average to smooth the transition between adjacent bands
                if (analyzerBars.length > 0 && idx == analyzerBars[analyzerBars.length - 1].dataIdx) {
                    avg = true;
                    prevBin += Math.round((nextBin - bin) / 2);
                }
            }
        }

        analyzerBars.push({
            posX: index * (barWidth + barSpace),
            dataIdx: idx,
            endIdx: prevBin - idx > 0 ? prevBin : 0,
            average: avg,
            peak: 0,
            hold: 0,
            accel: 0
        });
    });
}

/**
 * Redraw the canvas
 * this is called 60 times per second by requestAnimationFrame()
 */
function draw() {

    var grad = "classic",
        i, j, l, bar, barHeight;

    if (cfgBlackBg)	// use black background
        canvasCtx.fillStyle = '#000';
    else 				// use background color defined by gradient
        canvasCtx.fillStyle = gradients[grad].bgColor;
    // clear the canvas
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // get a new array of data from the FFT
    analyzer.getByteFrequencyData(dataArray);

    l = analyzerBars.length;
    for (i = 0; i < l; i++) {

        bar = analyzerBars[i];

        if (bar.endIdx == 0) 	// single FFT bin
            barHeight = dataArray[bar.dataIdx] / 255 * canvas.height;
        else { 					// range of bins
            barHeight = 0;
            if (bar.average) {
                // use the average value of the range
                for (j = bar.dataIdx; j <= bar.endIdx; j++)
                    barHeight += dataArray[j];
                barHeight = barHeight / (bar.endIdx - bar.dataIdx + 1) / 255 * canvas.height;
            }
            else {
                // use the highest value in the range
                for (j = bar.dataIdx; j <= bar.endIdx; j++)
                    barHeight = Math.max(barHeight, dataArray[j]);
                barHeight = barHeight / 255 * canvas.height;
            }
        }

        if (barHeight > bar.peak) {
            bar.peak = barHeight;
            bar.hold = 30; // set peak hold time to 30 frames (0.5s)
            bar.accel = 0;
        }

        canvasCtx.fillStyle = gradients[grad].gradient;
        canvasCtx.fillRect(bar.posX, canvas.height, barWidth, -barHeight);

        if (bar.peak > 0) {
            if (cfgShowPeaks)
                canvasCtx.fillRect(bar.posX, canvas.height - bar.peak, barWidth, 2);

            if (bar.hold)
                bar.hold--;
            else {
                bar.accel++;
                bar.peak -= bar.accel;
            }
        }
    }

    if (audioStarted)
        requestAnimationFrame(draw);
    else {
        canvasCtx.fillStyle = '#000';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(draw);
    }
}

export const AudioMotionInitialize = (ctx, input, c, bufferLength) => {
    audioCtx = ctx;
    dataArray = new Uint8Array(bufferLength);
    canvasCtx = c.getContext("2d");
    pixelRatio = window.devicePixelRatio; // for Retina / HiDPI devices

    // Adjust canvas width and height to match the display's resolution
    //canvas.width = window.screen.width * pixelRatio;
    //canvas.height = window.screen.height * pixelRatio;
    canvasCtx.lineWidth = 4 * pixelRatio;
    canvasCtx.lineJoin = 'round';
    analyzer = input;
    canvas = c;

    // Create gradients
    var grad, i;
    Object.keys(gradients).forEach(function (key) {
        grad = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
        if (gradients[key].hasOwnProperty('colorStops')) {
            for (i = 0; i < gradients[key].colorStops.length; i++)
                grad.addColorStop(gradients[key].colorStops[i].stop, gradients[key].colorStops[i].color);
        }
        // rainbow gradients are easily created iterating over the hue value
        else if (key == 'prism') {
            for (i = 0; i <= 240; i += 60)
                grad.addColorStop(i / 240, 'hsl( ' + i + ', 100%, 50% )');
        }
        else if (key == 'rainbow') {
            grad = canvasCtx.createLinearGradient(0, 0, canvas.width, 0); // this one is a horizontal gradient
            for (i = 0; i <= 360; i += 60)
                grad.addColorStop(i / 360, 'hsl( ' + i + ', 100%, 50% )');
        }
        // save the actual gradient back into the gradients array
        gradients[key].gradient = grad;
    });

    elMode = 3;//document.getElementById('mode');
    cfgShowPeaks = false;
    cfgBlackBg = true;


    // if no data found from last session, use the 'full resolution' preset
    presets['last'] = JSON.parse(JSON.stringify(presets['octave']));
    // and set some additional default options
    presets['last'].gradient = 'prism';
    presets['last'].cycleGrad = true;
    presets['last'].showScale = true;
    presets['last'].highSens = false;
    presets['last'].showPeaks = true;
    presets['last'].showSong = false;

    preCalcPosX();
    //requestAnimationFrame(draw);

    return {
        stop: () => {
            audioStarted = false;
        },
        start: () => {
            audioStarted = true;
            draw();
        }
    }
}