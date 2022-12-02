package main

import (
	"fmt"
	"math"
)

// Create a byte (float32, not Go byte) buffer, which will be available in Wasm Memory.
// We can then share this buffer with JS and Wasm.
const BUFFER_SIZE int = 2048

var buf [BUFFER_SIZE]float32

func main() {
	fmt.Println("call wasm.exports.autoCorrelate() from JS in the browser:")
}

// GetBufferPointer returns a pointer (index) to our buffer in wasm memory.
//
//export getBufferPointer
func getBufferPointer() *[BUFFER_SIZE]float32 {
	return &buf
}

// GetBufferSize returns the size of our buffer in wasm memory.
//
//export getBufferSize
func getBufferSize() int {
	return BUFFER_SIZE
}

type Pitch float32

var octaveLen = 7.0

//export autoCorrelate
func autoCorrelate(sampleRate, thres float64) Pitch {
	size := len(buf)
	rms := float64(0.0)
	for _, v := range buf {
		val := float64(v)
		rms += val * val
	}
	rms = math.Sqrt(rms / float64(size))
	if rms < thres {
		return -1
	}

	r1 := 0
	r2 := size - 1

	for i := 0; i < size/2; i++ {
		if math.Abs(float64(buf[i])) < thres {
			r1 = i
			break
		}
	}

	for i := 1; i < size/2; i++ {
		if math.Abs(float64(buf[size-i])) < thres {
			r2 = size - i
			break
		}
	}

	bufSample := buf[r1:r2]
	size = len(bufSample)

	c := make([]float32, size)
	for i := 0; i < size; i++ {
		for j := 0; j < size-i; j++ {
			c[i] = c[i] + bufSample[j]*bufSample[j+i]
		}
	}

	d := 0
	for d < size-2 && c[d] > c[d+1] {
		d++
	}

	maxVal := -1.0
	maxPos := -1

	for i := d; i < size; i++ {
		if float64(c[i]) > maxVal {
			maxVal = float64(c[i])
			maxPos = i
		}
	}

	t0 := maxPos

	// Handle case when d is already out-of-bounds of c
	if maxPos < 1 {
		return -1
	}

	x1 := c[t0-1]
	x2 := c[t0]
	x3 := c[t0+1]

	a := float64((x1 + x3 - 2*x2) / 2)
	b := float64((x3 - x1) / 2)

	return Pitch(sampleRate / (float64(t0) - b/(2*a)))
}
