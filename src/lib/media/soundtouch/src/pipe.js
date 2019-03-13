/*
* SoundTouch JS audio processing library
* Copyright (c) Olli Parviainen
* Copyright (c) Ryan Berdeen
*
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU Lesser General Public
* License as published by the Free Software Foundation; either
* version 2.1 of the License, or (at your option) any later version.
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
* Lesser General License for more details.
*
* You should have received a copy of the GNU Lesser General Public
* License along with this library; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
*/


function AbstractFifoSamplePipe(createBuffers) {
    if (createBuffers) {
        this.inputBuffer = new FifoSampleBuffer();
        this.outputBuffer = new FifoSampleBuffer();
    }
    else {
        this.inputBuffer = this.outputBuffer = null;
    }
}
        
AbstractFifoSamplePipe.prototype = {
    get inputBuffer() {
        return this._inputBuffer;
    },

    set inputBuffer (inputBuffer) {
      this._inputBuffer = inputBuffer;
    },

    get outputBuffer() {
        return this._outputBuffer;
    },

    set outputBuffer(outputBuffer) {
      this._outputBuffer = outputBuffer;
    },

    clear: function () {
        this._inputBuffer.clear();
        this._outputBuffer.clear();
    }
};
