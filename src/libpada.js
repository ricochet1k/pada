
export function executePada(src, inStream = null, outStream = null, debugChar = null) {
	inStream = inStream == null? process.stdin : inStream;
	outStream = outStream == null? process.stdout : outStream;
	var ps = new PadaState(src, inStream, outStream, debugChar);
	while (!ps.isEof) {
		if (ps.executeOne())
			process.stdout.write(ps.tree.toString()); // debug output
	}
}

var ioBuffer = new Buffer(1);

export class PadaState {
	constructor(src, inStream, outStream, debugChar = null) {
		this.tree = new Tree();
		this.pc = -1;
		this.isEof = false;
		this.src = src;
		this.inStream = inStream;
		this.outStream = outStream;
		this.debugChar = debugChar;

		var debugStr = (debugChar == null? "" : debugChar);
		this.cmdRegex = new RegExp("[Oo\.Qq10~v^wr#?*" + debugStr + "]");

		this.movePC(1); // advance to first char
	}

	executeOne() {
		var ret = undefined;

		var cmd = this.src[this.pc]; // todo: handle if it's a buffer?
		// console.log("Executing cmd: " + cmd);

		switch (cmd) {
			case 'O':
				this.tree.toggleBit(2);
				break;
			case 'o':
				this.tree.toggleBit(1);
				break;
			case '.':
				this.tree.toggleBit(0);
				break;
			case 'Q':
				this.tree.toggleBit(0);
				this.tree.toggleBit(1);
				this.tree.toggleBit(2);
				break;
			case 'q':
				this.tree.toggleBit(0);
				this.tree.toggleBit(1);
				break;


			case '0':
				this.tree.setBit(3, 0);
				break;
			case '1':
				this.tree.setBit(3, 1);
				break;
			case '~':
				this.tree.toggleBit(3);
				break;

			case 'v':
				this.tree.pushBit(3);
				break;
			case '^':
				this.tree.popBit(3);
				break;

			case 'w':
				ioBuffer[0] = this.tree.getByte();
				this.outStream.write(ioBuffer);
				break;
			case 'r':
				var buf = this.inStream.read(1);
				this.tree.setByte(buf[0]);
				break;

			case '#':
				this.tree.toggleBitLock(3);
				break;
			case '?':
				if (this.tree.getBit(3))
					this.movePC(1); // skip command
				break;

			case '*':
				var jump = this.tree.getByteSigned();
				var dir = 1;
				if (jump < 0) {
					dir = -1;
					jump = -jump;
				}

				while (jump-- > 0)
					this.movePC(dir); // skip command
				break;

			default:
				if (cmd == this.debugChar) {
					ret = true; // let caller handle it.
				}
				else {
					throw new Error("Unknown command! " + cmd);
				}
		}

		this.movePC(1); // move to next command
		return ret;
	}

	/// dir is 1 or -1: forward or backward
	movePC(dir) {
		var pc = this.pc;
		do {
			pc += dir;
		}
		while (pc < this.src.length && !this.cmdRegex.test(this.src[pc]));
		// console.log("PC: " + (pc - this.pc));
		this.pc = pc;
		this.isEof = pc >= this.src.length;
	}
}


export class Tree {
	constructor() {
		const treeSize = this._treeSize = 1 + 2 + 4 + 8;
		const bottomStart = this._bottomStart = treeSize - 8;

		function createArray(makeDefault) {
			var a = Array(treeSize);
			for (var i = 0; i < treeSize; i++) {
				a[i] = makeDefault();
			}
			return a;
		}

		this.tree = createArray(() => 0);
		this.treeLocks = createArray(() => 0);
		this.treeStacks = createArray(() => []);
	}

	getLevelIndex(level) {
		var i = 0;

		while (level > 0) {
			i = i*2 + this.tree[i] + 1;
			level --;
		}

		return i;
	}

	getBit(level) {
		return this.getBitIndex(this.getLevelIndex(level));
	}

	setBit(level, bit) {
		return this.setBitIndex(this.getLevelIndex(level), bit);
	}

	toggleBit(level) {
		return this.toggleBitIndex(this.getLevelIndex(level));
	}

	toggleBitLock(level) {
		return this.toggleBitLockIndex(this.getLevelIndex(level));
	}

	pushBit(level) {
		return this.pushBitIndex(this.getLevelIndex(level));
	}

	popBit(level) {
		return this.popBitIndex(this.getLevelIndex(level));
	}



	getBitIndex(i) {
		return this.tree[i];
	}

	setBitIndex(i, bit) {
		if (this.treeLocks[i] == 1)
			return this.tree[i];
		return this.tree[i] = bit;
	}

	toggleBitIndex(i) {
		if (this.treeLocks[i])
			return this.tree[i];
		return this.tree[i] ^= 1;
	}

	toggleBitLockIndex(i) {
		return this.treeLocks[i] ^= 1;
	}

	pushBitIndex(i) {
		var bit = this.tree[i];
		return this.treeStacks[i].push(bit);
	}

	popBitIndex(i) {
		var bit;
		if (this.treeStacks[i].length > 0) 
			bit = this.treeStacks[i].pop();
		else
			bit = Math.floor(Math.random()*2);

		if (this.treeLocks[i] == 1)
			return this.tree[i];
		return this.tree[i] = bit;
	}



	getByte() {
		var i = this.getLevelIndex(3);

		var byte = 0;

		for (var j = 0; j < 8; j++) { // 8 bits
			byte = (byte << 1) + this.tree[i];
			i ++;
			if (i >= this._treeSize)
				i = this._bottomStart;
		}

		return byte;
	}
	getByteSigned() {
		var byte = this.getByte();
		if (byte & (1 << 7))
			byte -= 256;
		return byte;
	}



	setByte(byte) {
		var i = this.getLevelIndex(3);

		for (var j = 0; j < 8; j++) { // 8 bits
			i --;
			if (i < this._bottomStart)
				i += 8;
			this.tree[i] = byte & 1;
			byte = byte >> 1;
		}
	}

	toString() {
		var a = this.tree;
		var tl = this.treeLocks;
		var ts = this.treeStacks;

		function s(i) {
			return a[i]? '\\' : '/';
		}
		function b(i) {
			return tl[i]? (a[i]? 'I' : 'O') : (a[i]? '1' : '0');
		}
		function t(i, d) {
			var s = ts[i];
			var len = s.length;
			// len - d is to access the array back to front == top to bottom
			return len > d? (s[len - d - 1]? '1' : '0') : ' ';
		}

		var indexArray = [0, 1, 2, 3, 4, 5, 6, 7].map((x) => x + this._bottomStart);

		var switches = 
			"       "+s(0)+"\n"+
			"   "+s(1)+"       "+s(2)+"\n"+
			" "+s(3)+"   "+s(4)+"   "+s(5)+"   "+s(6)+"\n";


		var byte = this.getByte();
		var byteSigned = this.getByteSigned();
		var char = String.fromCharCode(byte);

		var bits = indexArray.map(b).join(" ") + " = " + byte + ', ' + byteSigned + ", '" + char + "'" + "\n";

		var maxStack = Math.max.apply(null, this.treeStacks.slice(this._bottomStart).map((x) => x.length));

		var stacks = "";
		for (var j = 0; j < maxStack; j++) {
			stacks += indexArray.map((i) => t(i, j)).join(' ') + "\n";
		}


		return switches + bits + stacks;
	}
}


// p = require("./dist/libpada"); t = new p.Tree(); function prn() { console.log(t.toString()); }
// s = new p.PadaState("")