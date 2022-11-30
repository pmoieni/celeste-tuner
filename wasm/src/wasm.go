package main

import "fmt"

func main() {
	fmt.Println("call autoCorrelate from JS in the browser:")
	fmt.Println("wasm.exports.autoCorrelate(someBuffer, 44100, 50)")
}

//export autoCorrelate
func autoCorrelate(buf []float64, sampleRate, thres float64) float64 {
	fmt.Printf("buf: %+v\n", buf)
	fmt.Printf("sampleRate: %+v\n", sampleRate)
	fmt.Printf("thres: %+v\n", thres)
	return 0
}
