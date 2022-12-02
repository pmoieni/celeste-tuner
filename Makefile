main: clean wasm_exec
	tinygo build -o ./public/wasm/wasm.wasm -target wasm -no-debug ./wasm/src/autoCorrelate.go
	# cp ./main/index.html ./html/
	cp ./wasm/src/wasm.js ./public/wasm/

wasm_exec:
	cp `tinygo env TINYGOROOT`/targets/wasm_exec.js ./public/wasm

clean:
	rm -rf ./public/wasm
	mkdir ./public/wasm
