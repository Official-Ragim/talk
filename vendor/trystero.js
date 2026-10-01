//#region node_modules/@noble/secp256k1/index.js
var e = Object.freeze, t = 115792089237316195423570985008687907853269984665640564039457584007908834671663n, n = 115792089237316195423570985008687907852837564279074904382605163141518161494337n, r = 55066263022277343669578718895168534326250603453777594175500187360389116729240n, i = 32670510020758816978083085130507043184471273380659243275938904335757337482424n, a = e({
	p: t,
	n,
	h: 1n,
	a: 0n,
	b: 7n,
	Gx: r,
	Gy: i
}), o = 32, s = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && e.BYTES_PER_ELEMENT === 1, c = (e, t, n = "") => {
	if (s(e) && (t === void 0 || e.length === t)) return e;
	let r = s(e), i = t === void 0 ? "" : ` of length ${t}`, a = r ? `length=${e.length}` : `type=${typeof e}`, o = (n ? `"${n}" ` : "") + "expected Uint8Array" + i + ", got " + a;
	throw r ? RangeError(o) : TypeError(o);
}, l = (e) => Uint8Array.from(e), u = (e, t, n) => l(c(e, n, t)), d = (e, t) => e.toString(16).padStart(t, "0"), f = (e) => {
	let t = "";
	for (let n of c(e)) t += d(n, 2);
	return t;
}, p = (e) => {
	let t = "hex invalid";
	if (typeof e != "string") throw TypeError(t);
	if (e.length % 2 || !/^[\da-f]*$/i.test(e)) throw RangeError(t);
	let n = new Uint8Array(e.length / 2);
	for (let t = 0, r = 0; t < n.length; t++, r += 2) {
		let i = e.charCodeAt(r), a = e.charCodeAt(r + 1);
		n[t] = ((i & 15) + (i >> 6) * 9) * 16 + (a & 15) + (a >> 6) * 9;
	}
	return n;
}, m = () => {
	let e = globalThis?.crypto?.subtle;
	if (e) return e;
	throw Error("crypto.subtle must be defined, consider polyfill");
}, h = (...e) => {
	let t = 0;
	for (let n of e) t += c(n).length;
	let n = new Uint8Array(t), r = 0;
	for (let t of e) n.set(t, r), r += t.length;
	return n;
}, g = (e = o) => {
	let t = globalThis?.crypto;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined, consider polyfill");
	return t.getRandomValues(new Uint8Array(e));
}, _ = BigInt, v = (e, t, n, r = "bad number: out of range") => {
	if (typeof e != "bigint") throw TypeError(r);
	if (t <= e && e < n) return e;
	throw RangeError(r);
}, y = (e, n = t) => (e %= n) >= 0n ? e : n + e, b = (e) => y(e, n), x = (e, t) => {
	if (e === 0n) throw Error("invert: expected non-zero number");
	if (t <= 1n) throw Error("invert: expected modulus > 1, got " + t);
	let n = y(e, t), r = t, i = 0n, a = 1n;
	for (; n !== 0n;) {
		let e = r / n, t = r - n * e, o = i - a * e;
		r = n, n = t, i = a, a = o;
	}
	if (r !== 1n) throw Error("invert: does not exist");
	return y(i, t);
}, S = (e) => {
	let t = ae[e];
	if (typeof t != "function") throw Error("hashes." + e + " not set");
	return t;
}, C = (e, t, n) => c(S(e)(t, n), o, "digest"), w = async (e, t, n) => c(await S(e)(t, n), o, "digest"), T = (e) => {
	if (e instanceof M) return e;
	throw TypeError("Point expected");
}, E = "bad point: not on curve", D = (e) => y(y(e * e) * e + 7n), O = (e) => v(e, 0n, t), k = (e) => v(e, 1n, t), ee = (e) => v(e, 1n, n), A = (e) => !(e & 1n), j = (e) => Uint8Array.of(A(e) ? 2 : 3), te = (e) => {
	let n = D(k(e)), r = 1n;
	for (let e = n, i = 115792089237316195423570985008687907853269984665640564039457584007908834671664n / 4n; i > 0n; i >>= 1n) i & 1n && (r = r * e % t), e = e * e % t;
	if (y(r * r) !== n) throw Error("sqrt invalid");
	return new M(e, A(r) ? r : y(-r), 1n);
}, M = class n {
	static BASE;
	static ZERO;
	X;
	Y;
	Z;
	constructor(t, n, r) {
		this.X = O(t), this.Y = k(n), this.Z = O(r), e(this);
	}
	static CURVE() {
		return a;
	}
	static fromAffine(e) {
		let { x: t, y: r } = e;
		return t === 0n && r === 0n ? P : new n(t, r, 1n);
	}
	static fromBytes(e) {
		c(e);
		let t = e.length, r = e[0], i = I(e, 1, 33);
		try {
			if (t === 33 && (r === 2 || r === 3)) {
				let e = te(i);
				return r === 3 ? e.negate() : e;
			}
			if (t === 65 && r === 4) return new n(i, I(e, 33, 65), 1n).assertValidity();
		} catch {
			throw Error(E);
		}
		throw Error(E);
	}
	static fromHex(e) {
		return n.fromBytes(p(e));
	}
	get x() {
		return this.toAffine().x;
	}
	get y() {
		return this.toAffine().y;
	}
	equals(e) {
		let { X: t, Y: n, Z: r } = this, { X: i, Y: a, Z: o } = T(e);
		return y(t * o) === y(i * r) && y(n * o) === y(a * r);
	}
	is0() {
		return this.Z === 0n;
	}
	negate() {
		return new n(this.X, y(-this.Y), this.Z);
	}
	double() {
		return this.add(this);
	}
	add(e) {
		let { X: t, Y: r, Z: i } = this, { X: a, Y: o, Z: s } = T(e), c = 0n, l = 0n, u = 0n, d = 0n, f = y(7n * 3n), p = y(t * a), m = y(r * o), h = y(i * s), g = y(t + r), _ = y(a + o);
		g = y(g * _), _ = y(p + m), g = y(g - _), _ = y(t + i);
		let v = y(a + s);
		return _ = y(_ * v), v = y(p + h), _ = y(_ - v), v = y(r + i), l = y(o + s), v = y(v * l), l = y(m + h), v = y(v - l), d = y(c * _), l = y(f * h), d = y(l + d), l = y(m - d), d = y(m + d), u = y(l * d), m = y(p + p), m = y(m + p), h = y(c * h), _ = y(f * _), m = y(m + h), h = y(p - h), h = y(c * h), _ = y(_ + h), p = y(m * _), u = y(u + p), p = y(v * _), l = y(g * l), l = y(l - p), p = y(g * m), d = y(v * d), d = y(d + p), new n(l, u, d);
	}
	subtract(e) {
		return this.add(T(e).negate());
	}
	multiply(e, t = !0) {
		if (!t && e === 0n) return P;
		if (ee(e), e === 1n) return this;
		if (this.equals(N)) return Ee(e).p;
		let n = P, r = N, i = this;
		for (let a = 0; t ? a < 256 : e > 0n; a++) e & 1n ? n = n.add(i) : t && (r = r.add(i)), i = i.double(), e >>= 1n;
		return n;
	}
	multiplyUnsafe(e) {
		return this.multiply(e, !1);
	}
	toAffine() {
		let { X: e, Y: n, Z: r } = this;
		if (r === 0n) return {
			x: 0n,
			y: 0n
		};
		if (r === 1n) return {
			x: e,
			y: n
		};
		let i = x(r, t);
		if (y(r * i) !== 1n) throw Error("inverse invalid");
		return {
			x: y(e * i),
			y: y(n * i)
		};
	}
	assertValidity() {
		let { x: e, y: t } = this.toAffine();
		if (k(e), k(t), y(t * t) !== D(e)) throw Error(E);
		return this;
	}
	toBytes(e = !0) {
		let { x: t, y: n } = this.assertValidity().toAffine(), r = L(t);
		return e ? h(j(n), r) : h(Uint8Array.of(4), r, L(n));
	}
	toHex(e) {
		return f(this.toBytes(e));
	}
}, N = new M(r, i, 1n), P = new M(0n, 1n, 0n);
M.BASE = N, M.ZERO = P;
var ne = (e, t, n) => N.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), F = (e) => _("0x" + (f(e) || "0")), I = (e, t, n) => F(e.subarray(t, n)), L = (e) => p(d(v(e, 0n, 2n ** 256n), 64)), re = (e) => v(F(c(e, o, "secret key")), 1n, n, "invalid secret key: outside of range"), ie = "SHA-256", ae = {
	hmacSha256Async: async (e, t) => {
		let n = m(), r = await n.importKey("raw", e, {
			name: "HMAC",
			hash: ie
		}, !1, ["sign"]);
		return new Uint8Array(await n.sign("HMAC", r, t));
	},
	hmacSha256: void 0,
	sha256Async: async (e) => new Uint8Array(await m().digest(ie, e)),
	sha256: void 0
}, R = (e) => {
	if (e = e === void 0 ? g(48) : e, c(e), e.length < 48 || e.length > 1024) throw RangeError("expected 48-1024b");
	return L(y(F(e), n - 1n) + 1n);
}, z = (e) => (t) => {
	let n = R(t);
	return {
		secretKey: n,
		publicKey: e(n)
	};
}, B = (e) => Uint8Array.from("BIP0340/" + e, (e) => e.charCodeAt(0)), oe = (e, ...t) => {
	let n = C("sha256", B(e));
	return C("sha256", h(n, n, ...t));
}, se = (e, ...t) => w("sha256Async", B(e)).then((e) => w("sha256Async", h(e, e, ...t))), V = (e) => {
	let t = re(e), { x: n, y: r } = N.multiply(t).assertValidity().toAffine();
	return {
		d: A(r) ? t : b(-t),
		px: L(n)
	};
}, ce = (e) => b(F(e)), le = (...e) => ce(oe("challenge", ...e)), ue = async (...e) => ce(await se("challenge", ...e)), de = (e) => V(e).px, fe = /* @__PURE__ */ z(de), H = (e, t, n) => {
	let r = u(e, "message"), { px: i, d: a } = V(t);
	return {
		m: r,
		px: i,
		d: a,
		a: c(n, o)
	};
}, pe = (e) => {
	let t = ce(e);
	if (t === 0n) throw Error("sign failed: k is zero");
	let { px: n, d: r } = V(L(t));
	return {
		rx: n,
		k: r
	};
}, me = (e, t, n, r) => h(t, L(b(e + n * r))), he = "invalid signature produced", ge = (e, t, n = g(o)) => {
	let { m: r, px: i, d: a, a: s } = H(e, t, n), { rx: c, k: l } = pe(oe("nonce", L(a ^ F(oe("aux", s))), i, r)), u = me(l, c, le(c, i, r), a);
	if (!be(u, r, i)) throw Error(he);
	return u;
}, _e = async (e, t, n = g(o)) => {
	let { m: r, px: i, d: a, a: s } = H(e, t, n), { rx: c, k: l } = pe(await se("nonce", L(a ^ F(await se("aux", s))), i, r)), u = me(l, c, await ue(c, i, r), a);
	if (!await xe(u, r, i)) throw Error(he);
	return u;
}, ve = (e, t) => e instanceof Promise ? e.then(t) : t(e), ye = (e, t, n, r) => {
	let i = c(e, 64, "signature"), a = c(t, void 0, "message"), s = c(n, o, "publicKey"), l, u, d, f;
	try {
		l = te(F(s)), u = k(I(i, 0, o)), d = ee(I(i, o, 64)), f = h(L(u), s, a);
	} catch {
		return !1;
	}
	return ve(r(f), (e) => {
		try {
			let { x: t, y: n } = ne(l, d, b(-e)).toAffine();
			return !(!A(n) || t !== u);
		} catch {
			return !1;
		}
	});
}, be = (e, t, n) => ye(e, t, n, le), xe = async (e, t, n) => ye(e, t, n, ue), Se = /* @__PURE__ */ e({
	keygen: fe,
	getPublicKey: de,
	sign: ge,
	verify: be,
	signAsync: _e,
	verifyAsync: xe
}), Ce = () => {
	let e = [], t = N, n = t;
	for (let r = 0; r < 33; r++) {
		n = t, e.push(n);
		for (let r = 1; r < 128; r++) n = n.add(t), e.push(n);
		t = n.double();
	}
	return e;
}, we = void 0, Te = (e, t) => {
	let n = t.negate();
	return e ? n : t;
}, Ee = (e) => {
	let t = we ||= Ce(), n = P, r = N;
	for (let i = 0; i < 33; i++) {
		let a = Number(e & 255n);
		e >>= 8n, a > 128 && (a -= 256, e += 1n);
		let o = i * 128, s = o + Math.abs(a) - 1, c = i % 2 != 0, l = a < 0;
		a === 0 ? r = r.add(Te(c, t[o])) : n = n.add(Te(l, t[s]));
	}
	if (e !== 0n) throw Error("invalid wnaf");
	return {
		p: n,
		f: r
	};
}, { floor: De, min: Oe, sin: ke } = Math, U = "Trystero", Ae = (e, t) => Array(e).fill(void 0).map(t), je = "0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz", Me = (e) => Ae(e, () => je[De(Math.random() * 62)] ?? "").join(""), W = Me(20), Ne = Promise.all.bind(Promise), Pe = typeof window < "u", { entries: Fe, fromEntries: Ie, keys: G, values: Le } = Object, K = () => {}, Re = "candidate", q = (e) => (e !== null && clearTimeout(e), null), J = (e) => /* @__PURE__ */ Error(`${U}: ${e}`), ze = (e, t) => e instanceof Error && e.message ? e.message : typeof e == "string" && e ? e : Z(e ?? t), Y = (e, t) => e instanceof Error ? e : J(ze(e, t)), Be = new TextEncoder(), Ve = new TextDecoder(), X = (e) => Be.encode(e), He = (e) => Ve.decode(e), Ue = (e) => e.reduce((e, t) => e + t.toString(16).padStart(2, "0"), ""), We = (...e) => e.join("@"), Ge = (e, t) => {
	let n = [...e], r = () => {
		let e = ke(t++) * 1e4;
		return e - De(e);
	}, i = n.length;
	for (; i;) {
		let e = De(r() * i--), t = n[i];
		n[i] = n[e], n[e] = t;
	}
	return n;
}, Ke = (e, t, n, r = !1) => e.relayConfig?.urls || (r ? Ge(t, Je(e.appId)) : t).slice(0, e.relayConfig?.redundancy ?? n), Z = JSON.stringify, qe = (e) => {
	try {
		return JSON.parse(e);
	} catch {
		throw J(`failed to parse JSON: ${e}`);
	}
}, Je = (e, t = 2 ** 53 - 1) => e.split("").reduce((e, t) => e + t.charCodeAt(0), 0) % t, Ye = 3333, Xe = 6e4, Ze = {}, Qe = null, $e = null, et = () => {
	Qe ||= new Promise((e) => {
		$e = e;
	}).finally(() => {
		$e = null, Qe = null;
	});
}, tt = () => {
	$e?.();
}, nt = (e, t, n) => {
	let r = {}, i = !1, a = !1, o, s = K;
	r.isClosed = !1, r.ready = new Promise((e) => s = e);
	let c = () => {
		if (r.isClosed) return;
		o = void 0, a = !1;
		let l = new WebSocket(e);
		l.onclose = () => {
			if (r.isClosed || a) return;
			if (a = !0, Qe) {
				Qe.then(c);
				return;
			}
			let t = Ze[e] ??= Ye;
			if (t >= Xe) {
				r.isClosed = !0;
				return;
			}
			o = setTimeout(c, Math.random() * t), Ze[e] = Oe(t * 2, Xe);
		}, l.onmessage = (e) => t(String(e.data)), r.socket = l, r.url = l.url, l.onopen = () => {
			let t = i;
			i = !0, s(r), Ze[e] = Ye, t && n?.();
		}, r.send = (e) => {
			l.readyState === 1 && l.send(e);
		};
	};
	return r.close = () => {
		r.isClosed = !0, o !== void 0 && (clearTimeout(o), o = void 0), r.socket.close();
	}, c(), r;
}, rt = (e) => {
	let t = {}, n = /* @__PURE__ */ new WeakMap(), r = (e) => {
		let t = n.get(e);
		if (!t) throw J("relay bookkeeping missing registration for relay client");
		return t;
	}, i = () => {
		let e = {}, t = (t) => e[t] ??= {};
		return {
			forKey: t,
			forRelay: (e) => t(r(e))
		};
	}, a = (e, r) => (t[e] = r, n.set(r, e), r);
	return {
		register: (e, n) => t[e] || a(e, n()),
		keyOf: r,
		scoped: i,
		getSockets: () => Ie(Fe(t).flatMap(([t, n]) => {
			let r = e(n);
			return r ? [[t, r]] : [];
		}))
	};
}, it = () => {
	if (Pe) {
		let e = new AbortController();
		return addEventListener("online", tt, { signal: e.signal }), addEventListener("offline", et, { signal: e.signal }), () => e.abort();
	}
	return K;
}, at = "AES-GCM", ot = {}, st = (e) => btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(e)))), ct = (e) => {
	let t = atob(e);
	return new Uint8Array(t.length).map((e, n) => t.charCodeAt(n)).buffer;
}, lt = async (e, t) => new Uint8Array(await crypto.subtle.digest(e, X(t))), ut = async (e) => ot[e] ??= Array.from(await lt("SHA-1", e)).map((e) => e.toString(36)).join(""), dt = async (e, t, n) => crypto.subtle.importKey("raw", await crypto.subtle.digest({ name: "SHA-256" }, X(`${e}:${t}:${n}`)), { name: at }, !1, ["encrypt", "decrypt"]), ft = async (e, t) => Ue(await lt("SHA-256", `${U}:${e}:${t}`)), pt = "$", mt = ",", ht = async (e, t) => {
	let n = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	return n.join(mt) + pt + st(await crypto.subtle.encrypt({
		name: at,
		iv: n
	}, await e, X(t)));
}, gt = async (e, t) => {
	let [n, r] = t.split(pt);
	return He(await crypto.subtle.decrypt({
		name: at,
		iv: new Uint8Array(n?.split(mt).map(Number) ?? [])
	}, await e, ct(r ?? "")));
}, _t = 57333, vt = 18e4, yt = 20, bt = class {
	makeOffer;
	pool = [];
	pooled = /* @__PURE__ */ new Set();
	leased = /* @__PURE__ */ new Map();
	recycling = /* @__PURE__ */ new Set();
	cleanupTimer = null;
	active = !1;
	constructor(e) {
		this.makeOffer = e;
	}
	get isActive() {
		return this.active;
	}
	warmup() {
		this.pool = [], this.pooled.clear(), Ae(yt, this.makeOffer).forEach((e) => this.push(e)), this.active = !0, this.cleanupTimer = setInterval(() => {
			this.pool = this.pool.filter((e) => !e.isDead || (this.pooled.delete(e), !1));
		}, _t);
	}
	push(e) {
		e.isDead || this.pooled.has(e) || this.leased.has(e) || (this.pool.push(e), this.pooled.add(e));
	}
	shift(e) {
		let t = [];
		for (; t.length < e && this.pool.length > 0;) {
			let e = this.pool.shift();
			if (!e) break;
			this.pooled.delete(e), t.push(e);
		}
		return t;
	}
	claimLeased(e) {
		let t = this.leased.get(e);
		t && (q(t), this.leased.delete(e));
	}
	recycle(e) {
		if (!(e.isDead || this.recycling.has(e))) {
			if (e.connection.remoteDescription) {
				e.destroy();
				return;
			}
			if (!this.active) {
				e.destroy();
				return;
			}
			this.recycling.add(e), e.setHandlers({
				connect: K,
				close: K,
				error: K
			}), e.getOffer(!0).then((t) => {
				if (!t || t.type !== "offer" || e.isDead || !this.active) {
					e.destroy();
					return;
				}
				this.push(e);
			}).catch(() => e.destroy()).finally(() => this.recycling.delete(e));
		}
	}
	reclaimLeased(e) {
		let t = this.leased.get(e);
		t && (q(t), this.leased.delete(e), this.recycle(e));
	}
	lease(e) {
		this.claimLeased(e), this.leased.set(e, setTimeout(() => {
			this.leased.delete(e), this.recycle(e);
		}, vt));
	}
	checkout(e, t, n) {
		let r = this.shift(e), i = Math.max(0, e - r.length);
		i > 0 && r.push(...Ae(i, this.makeOffer));
		let a = async (e, r = !1) => {
			try {
				let r = await n(e);
				return t ? (this.lease(e), {
					peer: e,
					offer: r,
					claim: () => this.claimLeased(e),
					reclaim: () => this.reclaimLeased(e)
				}) : {
					peer: e,
					offer: r
				};
			} catch (t) {
				if (this.claimLeased(e), this.pooled.delete(e), e.destroy(), !r) return a(this.makeOffer(), !0);
				throw t;
			}
		};
		return Ne(r.map((e) => a(e)));
	}
	getOffers(e, t) {
		return this.checkout(e, !0, t);
	}
	destroy() {
		this.active = !1, this.cleanupTimer &&= (clearInterval(this.cleanupTimer), null), this.pool.forEach((e) => e.destroy()), this.pool = [], this.pooled.clear(), this.leased.forEach((e, t) => {
			q(e), t.destroy();
		}), this.leased.clear(), this.recycling.forEach((e) => e.destroy()), this.recycling.clear();
	}
}, xt = J("incorrect password for overlapping room"), St = (e, t, n) => {
	let r = (r) => lt("SHA-256", `${r}:${e}:${t}:${n}`).then(Ue), i = async (t, n, i) => {
		if (!e) return;
		if (i) {
			let e = Me(36);
			await t({
				__trystero_pw: "challenge",
				c: e
			});
			let { data: i } = await n();
			if (!i || typeof i != "object" || i.__trystero_pw !== "response" || typeof i.h != "string") throw xt;
			let a = await r(e);
			if (i.h !== a) throw xt;
			return;
		}
		let { data: a } = await n();
		if (!a || typeof a != "object" || a.__trystero_pw !== "challenge" || typeof a.c != "string") throw xt;
		await t({
			__trystero_pw: "response",
			h: await r(a.c)
		});
	};
	return {
		run: i,
		compose: (t) => e || t ? async (e, n, r, a) => {
			await i(n, r, a), await t?.(e, n, r, a);
		} : void 0
	};
}, Ct = (e) => {
	let t = ze(e, "unknown error");
	return t.startsWith("handshake ") ? t : `handshake failed: ${t}`;
}, wt = ({ onPeerHandshake: e, onHandshakeError: t, handshakeTimeoutMs: n, sendHandshakeData: r, sendHandshakeReady: i, onActivate: a, onFailure: o }) => {
	let s = {}, c = (e, t) => {
		let n = s[e];
		!n || t && n.peer !== t || n.isActive || n.didLocalHandshakePass && n.didReceiveRemoteReady && (n.isActive = !0, n.handshakeTimer = q(n.handshakeTimer), a(e, n.peer));
	}, l = (e, n, r) => {
		let i = s[e];
		if (!i || i.peer !== n) return;
		let a = Ct(r);
		t?.(e, a), o(e, n, J(a));
	}, u = (e, t) => {
		let n = s[e];
		n && n.peer === t && !n.isActive && (n.didLocalHandshakePass = !0, i("", e).catch((n) => l(e, t, J(`failed sending handshake readiness: ${ze(n, "unknown send failure")}`))), c(e, t));
	};
	return {
		addPeer: (e, t) => {
			s[e] = {
				peer: t,
				isActive: !1,
				didLocalHandshakePass: !1,
				didReceiveRemoteReady: !1,
				handshakeTimer: null,
				pendingHandshakePayloads: [],
				handshakeWaiters: []
			};
		},
		clearPeer: (e, t) => {
			let n = s[e];
			n && (n.handshakeTimer = q(n.handshakeTimer), n.pendingHandshakePayloads.length = 0, n.handshakeWaiters.splice(0).forEach((e) => e.reject(t)), delete s[e]);
		},
		canReceiveFromPeer: (e, t) => {
			let n = s[e];
			return !!(n && (n.isActive || t));
		},
		start: (t, i) => {
			let a = s[t];
			if (!a || a.peer !== i) return;
			a.handshakeTimer = setTimeout(() => l(t, i, J(`handshake timed out after ${n}ms`)), n);
			let o = async (e, n) => {
				await r(e, t, n);
			}, c = () => new Promise((e, n) => {
				let r = s[t];
				if (!r || r.peer !== i) {
					n(J("peer disconnected during handshake"));
					return;
				}
				let a = r.pendingHandshakePayloads.shift();
				if (a) {
					e(a);
					return;
				}
				r.handshakeWaiters.push({
					resolve: e,
					reject: (e) => n(e)
				});
			}), d = W < t;
			Promise.resolve(e?.(t, o, c, d)).then(() => u(t, i)).catch((e) => l(t, i, Y(e, "handshake failed")));
		},
		receiveHandshakeData: (e, t, n) => {
			let r = s[t];
			if (!r || r.isActive) return;
			let i = n === void 0 ? { data: e } : {
				data: e,
				metadata: n
			}, a = r.handshakeWaiters.shift();
			if (a) {
				a.resolve(i);
				return;
			}
			r.pendingHandshakePayloads.push(i);
		},
		receiveHandshakeReady: (e) => {
			let t = s[e];
			t && !t.isActive && (t.didReceiveRemoteReady = !0, c(e));
		}
	};
}, Tt = 15e3, Et = 5e3, Dt = "icegatheringstatechange", Ot = "iceconnectionstatechange", kt = "offer", At = "answer", jt = /out of range/i, Mt = (e) => e.replace(/ (\S+\.local) (\d+) typ host/g, " 127.0.0.1 $2 typ host"), Nt = (e, { trickleIce: t, rtcConfig: n, rtcPolyfill: r, turnConfig: i, _test_only_mdnsHostFallbackToLoopback: a }) => {
	let o = new (r ?? RTCPeerConnection)({
		iceServers: Pt.concat(i ?? []),
		...n
	}), s = {}, c = [], l = [], u = t !== !1, d = [], f = [], p = !1, m = !1, h = null, g = null, _ = !1, v = () => g = q(g), y = () => {
		_ || (_ = !0, v(), s.close?.());
	}, b = (e) => {
		s.signal ? s.signal(e) : c.push(e);
	}, x = (e) => {
		let t = s.signal;
		s.signal = (n) => {
			t?.(n), e(n);
		}, c.length > 0 && c.splice(0).forEach((e) => s.signal?.(e));
	}, S = (e) => a ? Mt(e) : e, C = (e) => {
		if (!a || typeof e.candidate != "string") return e;
		let t = Mt(e.candidate);
		return t === e.candidate ? e : {
			...e,
			candidate: t
		};
	}, w = (e) => ({
		type: e.localDescription?.type ?? kt,
		sdp: S(e.localDescription?.sdp ?? "")
	}), T = () => {
		let e = o.remoteDescription?.sdp;
		return e ? e.match(/a=ice-ufrag:([^\s]+)/)?.[1] ?? null : null;
	}, E = () => (o.remoteDescription?.sdp?.match(/^m=/gm) ?? []).length, D = (e) => {
		if (!o.remoteDescription) return !1;
		let t = E();
		if (typeof e.sdpMLineIndex == "number" && t > 0 && e.sdpMLineIndex >= t) return !1;
		let n = T();
		return !(n && e.usernameFragment && e.usernameFragment !== n);
	}, O = async (e) => {
		try {
			return await o.addIceCandidate(e), !0;
		} catch (t) {
			if (t instanceof Error && jt.test(t.message) && typeof e.sdpMLineIndex == "number") return !1;
			throw t;
		}
	}, k = async () => {
		if (!o.remoteDescription || d.length === 0) return;
		let e = d.splice(0), t = [];
		for (let n of e) {
			if (!D(n)) {
				t.push(n);
				continue;
			}
			await O(n) || t.push(n);
		}
		t.length > 0 && d.push(...t);
	}, ee = async (e) => {
		if (D(e)) {
			await O(e) || d.push(e);
			return;
		}
		d.push(e);
	}, A = (e) => {
		e.binaryType = "arraybuffer", e.bufferedAmountLowThreshold = 65535, e.onmessage = (e) => {
			let t = e.data;
			s.data ? s.data(t) : l.push(t);
		}, e.onopen = () => s.connect?.(), e.onclose = y, e.onerror = ({ error: e }) => s.error?.(Y(e, "data channel error"));
	}, j = async (e) => {
		let t = null;
		try {
			await Promise.race([new Promise((t) => {
				let n = () => {
					e.iceGatheringState === "complete" && (e.removeEventListener(Dt, n), t());
				};
				e.addEventListener(Dt, n), n();
			}), new Promise((e) => {
				t = setTimeout(e, Tt);
			})]);
		} finally {
			q(t);
		}
		return w(e);
	}, te = async () => {
		let e = u ? w(o) : await j(o);
		return b(e), e;
	};
	e ? (h = o.createDataChannel("data"), A(h)) : o.ondatachannel = ({ channel: e }) => {
		h = e, A(e);
	};
	let M = async (e = !1) => {
		if (o.connectionState !== "closed") try {
			return p = !0, e && (o.signalingState !== "stable" && o.signalingState !== "closed" && o.localDescription?.type === kt && await o.setLocalDescription({ type: "rollback" }), typeof o.restartIce == "function" && o.restartIce()), await o.setLocalDescription(e ? await o.createOffer({ iceRestart: !0 }) : void 0), await te();
		} catch (e) {
			s.error?.(Y(e, "failed to create local offer"));
		} finally {
			p = !1;
		}
	};
	o.onnegotiationneeded = async () => M(!1), o.onicecandidate = ({ candidate: e }) => {
		if (!u || !e) return;
		let t = C(typeof e.toJSON == "function" ? e.toJSON() : {
			candidate: e.candidate,
			sdpMid: e.sdpMid,
			sdpMLineIndex: e.sdpMLineIndex,
			usernameFragment: e.usernameFragment
		});
		b({
			type: Re,
			sdp: JSON.stringify(t)
		});
	};
	let N = () => {
		if (o.connectionState === "failed" || o.connectionState === "closed" || o.iceConnectionState === "failed" || o.iceConnectionState === "closed") {
			y();
			return;
		}
		if (o.connectionState === "connected" || o.connectionState === "connecting" || o.iceConnectionState === "connected" || o.iceConnectionState === "completed" || o.iceConnectionState === "checking") {
			v();
			return;
		}
		if (o.connectionState === "disconnected" || o.iceConnectionState === "disconnected") {
			g ||= setTimeout(() => {
				g = null, (o.connectionState === "disconnected" || o.iceConnectionState === "disconnected") && y();
			}, Et);
			return;
		}
	};
	o.onconnectionstatechange = N, o.addEventListener(Ot, N), o.ontrack = (e) => {
		let t = e.streams[0];
		if (t) {
			if (!s.track && !s.stream) {
				f.push({
					track: e.track,
					stream: t
				});
				return;
			}
			s.track?.(e.track, t), s.stream?.(t);
		}
	}, o.onremovestream = (e) => s.stream?.(e.stream);
	let P = e ? new Promise((e) => x((t) => {
		t.type === kt && e(t);
	})) : Promise.resolve();
	return e && queueMicrotask(() => {
		!p && o.signalingState === "stable" && !o.localDescription && o.connectionState !== "closed" && o.onnegotiationneeded?.(new Event("negotiationneeded"));
	}), {
		created: Date.now(),
		connection: o,
		get channel() {
			return h;
		},
		get isDead() {
			return o.connectionState === "closed";
		},
		getOffer: async (t = !1) => {
			if (e) return t ? M(!0) : o.localDescription?.type === kt ? u ? w(o) : j(o) : P;
		},
		async signal(t) {
			if (t.type === "candidate") {
				try {
					let e = JSON.parse(t.sdp);
					e && typeof e == "object" && await ee(C(e));
				} catch (e) {
					s.error?.(Y(e, "failed to parse remote candidate"));
				}
				return;
			}
			if (h?.readyState !== "open" || t.sdp?.includes("a=rtpmap")) try {
				let n = {
					...t,
					sdp: S(t.sdp)
				};
				if (t.type === kt) {
					if (p || o.signalingState !== "stable" && !m) {
						if (e) return;
						await Ne([o.setLocalDescription({ type: "rollback" }), o.setRemoteDescription(n)]);
					} else await o.setRemoteDescription(n);
					return await k(), await o.setLocalDescription(), await te();
				}
				if (t.type === At) {
					m = !0;
					try {
						await o.setRemoteDescription(n), await k();
					} finally {
						m = !1;
					}
				}
			} catch (e) {
				s.error?.(Y(e, "failed to apply remote signal"));
			}
		},
		sendData: (e) => h?.send(e),
		destroy: () => {
			v(), h?.close(), o.close(), p = !1, m = !1, y();
		},
		setHandlers: (e) => {
			let { signal: t, ...n } = e;
			Object.assign(s, n), s.data && l.length > 0 && l.splice(0).forEach((e) => s.data?.(e)), t && x(t), (s.track || s.stream) && f.length > 0 && f.splice(0).forEach(({ track: e, stream: t }) => {
				s.track?.(e, t), s.stream?.(t);
			});
		},
		offerPromise: P,
		addStream: (e) => e.getTracks().forEach((t) => o.addTrack(t, e)),
		removeStream: (e) => o.getSenders().filter((t) => t.track && e.getTracks().includes(t.track)).forEach((e) => o.removeTrack(e)),
		addTrack: (e, t) => o.addTrack(e, t),
		removeTrack: (e) => {
			let t = o.getSenders().find((t) => t.track === e);
			t && o.removeTrack(t);
		},
		replaceTrack: (e, t) => {
			let n = o.getSenders().find((t) => t.track === e);
			if (n) return n.replaceTrack(t);
		}
	};
}, Pt = [...Ae(3, (e, t) => `stun:stun${t || ""}.l.google.com:19302`), "stun:stun.cloudflare.com:3478"].map((e) => ({ urls: e })), Ft = Object.getPrototypeOf(Uint8Array), It = 32, Lt = 0, Rt = 32, zt = 34, Bt = 35, Vt = 36, Ht = 16348, Ut = 255, Wt = 65535, Gt = "bufferedamountlow", Kt = "close", qt = "error", Jt = 1e4, Yt = (e) => e instanceof ArrayBuffer ? new Uint8Array(e) : new Uint8Array(e.buffer, e.byteOffset, e.byteLength), Xt = (e, t = Jt) => e.readyState !== "open" || e.bufferedAmount <= e.bufferedAmountLowThreshold ? Promise.resolve(e.readyState === "open") : new Promise((n) => {
	let r = !1, i = null, a = (t) => {
		r || (r = !0, e.removeEventListener(Gt, o), e.removeEventListener(Kt, s), e.removeEventListener(qt, s), q(i), n(t));
	}, o = () => a(!0), s = () => a(!1);
	if (e.addEventListener(Gt, o), e.addEventListener(Kt, s), e.addEventListener(qt, s), i = setTimeout(() => a(!1), t), e.readyState !== "open") {
		a(!1);
		return;
	}
	e.bufferedAmount <= e.bufferedAmountLowThreshold && a(!0);
}), Zt = ({ getPeer: e, getPeerIds: t, canReceiveFromPeer: n, throwIfAborted: r }) => {
	let i = {}, a = {}, o = {}, s = {}, c = (n, r, { includePending: i = !1 } = {}) => (n ? Array.isArray(n) ? n : [n] : t(i)).flatMap((t) => {
		let n = e(t, i);
		return n ? [Promise.resolve(r(t, n))] : (console.warn(`${U}: no peer with id ${t} found`), []);
	});
	return {
		makeInternalAction: (t, n = {}) => {
			let o = a[t];
			if (i[t] && o) {
				let e = i[t].options;
				if (e.sendToPending !== !!n.sendToPending || e.receiveWhilePending !== !!n.receiveWhilePending) throw J(`action type "${t}" cannot be redefined`);
				return o;
			}
			if (!t) throw J("action type argument is required");
			let l = X(t);
			if (l.byteLength > It) throw J(`action type string "${t}" (${l.byteLength}b) exceeds byte limit (${It}). Hint: choose a shorter name.`);
			let u = {
				sendToPending: !!n.sendToPending,
				receiveWhilePending: !!n.receiveWhilePending
			}, d = new Uint8Array(It);
			d.set(l);
			let f = 0;
			return i[t] = {
				onComplete: K,
				onProgress: K,
				setOnComplete: (e) => {
					i[t].onComplete = e;
					let n = s[t];
					n?.length && (delete s[t], n.forEach(({ payload: t, peerId: n, metadata: r }) => e(t, n, r)));
				},
				setOnProgress: (e) => {
					i[t].onProgress = e;
				},
				send: async (t, n, i, a, o) => {
					r(o);
					let s = typeof t;
					if (s === "undefined") throw J("action data cannot be undefined");
					let l = s !== "string", p = t instanceof Blob, m = p || t instanceof ArrayBuffer || t instanceof Ft, h = i !== void 0, g = m ? Yt(p ? await t.arrayBuffer() : t) : X(l ? Z(t) : t), _ = h ? X(Z(i)) : null, v = Math.ceil(g.byteLength / Ht) + +!!h || 1, y = Ae(v, (e, t) => {
						let n = t === v - 1, r = !!(h && t === 0), i = new Uint8Array(Vt + (r ? _?.byteLength ?? 0 : n ? g.byteLength - Ht * (v - (h ? 2 : 1)) : Ht));
						return i.set(d), i.set([f >> 8, f & Ut], Rt), i.set([Number(n) | Number(r) << 1 | Number(m) << 2 | Number(l) << 3], zt), i.set([Math.round((t + 1) / v * Ut)], Bt), i.set(h ? r ? _ ?? /* @__PURE__ */ new Uint8Array() : g.subarray((t - 1) * Ht, t * Ht) : g.subarray(t * Ht, (t + 1) * Ht), Vt), i;
					});
					return f = f + 1 & Wt, await Ne(c(n, async (t, n) => {
						let { channel: s } = n, c = 0;
						for (; c < v;) {
							r(o);
							let l = y[c];
							if (!l) break;
							if (s && s.bufferedAmount > s.bufferedAmountLowThreshold) {
								let e = await Xt(s);
								if (r(o), !e) break;
							}
							let d = e(t, u.sendToPending);
							if (!d || d !== n) break;
							n.sendData(l), c++;
							let f = l[Bt] ?? Ut;
							a?.(f / Ut, t, i);
						}
					}, { includePending: u.sendToPending })), [];
				},
				options: u
			}, a[t] = {
				send: i[t].send,
				onMessage: i[t].setOnComplete,
				onProgress: i[t].setOnProgress
			};
		},
		handleData: (e, t) => {
			let r = new Uint8Array(t), a = He(r.subarray(Lt, Rt)).replaceAll("\0", ""), c = i[a];
			if (!n(e, !!c?.options.receiveWhilePending)) return;
			let l = (r[Rt] ?? 0) << 8 | (r[33] ?? 0), u = r[zt] ?? 0, d = r[Bt] ?? 0, f = r.subarray(Vt), p = !!(u & 1), m = !!(u & 2), h = !!(u & 4), g = !!(u & 8);
			o[e] ??= {}, o[e][a] ??= {};
			let _ = o[e][a][l] ??= { chunks: [] };
			if (m ? _.meta = qe(He(f)) : _.chunks.push(f), c?.onProgress(d / Ut, e, _.meta), !p) return;
			let v = new Uint8Array(_.chunks.reduce((e, t) => e + t.byteLength, 0));
			_.chunks.reduce((e, t) => (v.set(t, e), e + t.byteLength), 0), delete o[e][a][l];
			let y = h ? v : g ? qe(He(v)) : He(v);
			if (c) {
				c.onComplete(y, e, _.meta);
				return;
			}
			(s[a] ??= []).push({
				payload: y,
				peerId: e,
				..._.meta === void 0 ? {} : { metadata: _.meta }
			});
		},
		clearPeer: (e) => {
			delete o[e];
		}
	};
}, Qt = 500, $t = (e, t) => {
	let n = J(t);
	return n.kind = e, n.name = e === "aborted" ? "AbortError" : n.name, n;
}, en = (e) => {
	if (e?.aborted) throw $t("aborted", "operation aborted");
}, tn = (e) => e && typeof e == "object" && !Array.isArray(e) && typeof e.r == "string" ? {
	r: e.r,
	...Object.hasOwn(e, "m") ? { m: e.m } : {}
} : null, nn = (e) => e && typeof e == "object" && !Array.isArray(e) && typeof e.r == "string" ? {
	r: e.r,
	...typeof e.e == "string" ? { e: e.e } : {}
} : null, rn = (e, t) => t === void 0 ? e : {
	...e,
	metadata: t
}, an = ({ getPeer: e, getPeerIds: t, canReceiveFromPeer: n }) => {
	let r = {}, i = {}, a = Zt({
		getPeer: e,
		getPeerIds: t,
		canReceiveFromPeer: n,
		throwIfAborted: en
	}), o = a.makeInternalAction, s = a.handleData, c = (e) => {
		let t = i[e];
		t && (q(t.timer), t.signal && t.abortHandler && t.signal.removeEventListener("abort", t.abortHandler), delete i[e]);
	}, l = (e, t) => {
		Fe(i).forEach(([n, r]) => {
			r.peerId === e && (c(n), r.reject(t));
		});
	}, u = (e, t) => {
		a.clearPeer(e), l(e, $t("disconnected", ze(t, "peer disconnected")));
	}, d = o("@_response");
	return d.onMessage((e, t, n) => {
		let r = nn(n);
		if (!r) return;
		let a = i[r.r];
		if (a && a.peerId === t) {
			if (c(r.r), r.e !== void 0) {
				a.reject($t("rejected", r.e));
				return;
			}
			a.resolve(e);
		}
	}), {
		makeAction: (t, n) => {
			if (n && "onRequest" in n && n.kind !== "request") throw J("request actions must use kind: \"request\"");
			let a = n?.kind ?? "message", s = o(t), l = r[t];
			if (l) {
				if (l.kind !== a) throw J(`action type "${t}" cannot be redefined`);
				return l.action;
			}
			let u = {
				kind: a,
				action: null,
				pendingMessages: [],
				pendingRequests: [],
				onReceiveProgress: n?.onReceiveProgress ?? null
			}, f = (e, t) => e ? (n, r) => e(n, rn({ peerId: r }, t)) : void 0, p = (e) => {
				u.onReceiveProgress = e;
			};
			if (s.onProgress((e, t, n) => {
				let r = u.kind === "request" ? tn(n) : null;
				u.onReceiveProgress?.(e, rn({ peerId: t }, r ? r.m : n));
			}), a === "message") {
				let e = n?.onMessage ?? null, i = () => {
					if (!e) return;
					let t = e;
					u.pendingMessages.splice(0).forEach(({ payload: e, peerId: n, metadata: r }) => {
						Promise.resolve().then(() => t(e, rn({ peerId: n }, r))).catch((e) => console.error(`${U} action handler error:`, e));
					});
				}, a = {
					send: async (e, t = {}) => {
						await s.send(e, t.target, t.metadata, f(t.onProgress, t.metadata), t.signal);
					},
					get onMessage() {
						return e;
					},
					set onMessage(t) {
						e = t, i();
					},
					get onReceiveProgress() {
						return u.onReceiveProgress;
					},
					set onReceiveProgress(e) {
						p(e);
					}
				};
				return s.onMessage((t, n, r) => {
					if (!e) {
						u.pendingMessages.push(r === void 0 ? {
							payload: t,
							peerId: n
						} : {
							payload: t,
							peerId: n,
							metadata: r
						});
						return;
					}
					let i = e;
					Promise.resolve().then(() => i(t, rn({ peerId: n }, r))).catch((e) => console.error(`${U} action handler error:`, e));
				}), u.action = a, r[t] = u, i(), a;
			}
			let m = n?.onRequest ?? null, h = (e) => {
				q(e.timer);
				let t = u.pendingRequests.indexOf(e);
				t > -1 && u.pendingRequests.splice(t, 1);
			}, g = (e, t, n) => {
				d.send(null, e, {
					r: t,
					e: ze(n, "request failed")
				});
			}, _ = (e, t) => {
				h(e), Promise.resolve().then(() => t(e.payload, {
					peerId: e.peerId,
					...e.metadata === void 0 ? {} : { metadata: e.metadata },
					signal: e.controller.signal
				})).then(async (t) => {
					if (t === void 0) throw J("request handler returned undefined");
					await d.send(t, e.peerId, { r: e.requestId });
				}).catch((t) => g(e.peerId, e.requestId, t)).finally(() => e.controller.abort());
			}, v = () => {
				m && u.pendingRequests.slice().forEach((e) => _(e, m));
			}, y = (e, t, n, r) => {
				if (m) {
					let i = {
						payload: e,
						peerId: t,
						...n === void 0 ? {} : { metadata: n },
						requestId: r,
						controller: new AbortController(),
						timer: null
					};
					_(i, m);
					return;
				}
				let i = {
					payload: e,
					peerId: t,
					...n === void 0 ? {} : { metadata: n },
					requestId: r,
					controller: new AbortController(),
					timer: setTimeout(() => {
						h(i), i.controller.abort(), g(t, r, "request handler unavailable");
					}, Qt)
				};
				u.pendingRequests.push(i);
			}, b = async (t, n) => {
				let { target: r, metadata: a, onProgress: o, signal: l, timeoutMs: u } = n;
				if (en(l), !e(r, !1)) throw $t("disconnected", `no active peer with id ${r}`);
				let d = Me(20), p = new Promise((e, t) => {
					let n = {
						peerId: r,
						resolve: e,
						reject: t,
						timer: null,
						...l === void 0 ? {} : { signal: l }
					}, a = () => {
						c(d), t($t("aborted", "operation aborted"));
					};
					l && (n.abortHandler = a, l.addEventListener("abort", a, { once: !0 })), i[d] = n;
				}).catch((e) => {
					throw e;
				});
				try {
					await s.send(t, r, a === void 0 ? { r: d } : {
						r: d,
						m: a
					}, f(o, a), l);
					let e = i[d];
					return e && u !== void 0 && (e.timer = setTimeout(() => {
						c(d), e.reject($t("timeout", "request timed out"));
					}, u)), await p;
				} catch (e) {
					throw c(d), e;
				}
			}, x = {
				request: b,
				requestMany: async (e, t) => (en(t.signal), await Ne(t.targets.map(async (n) => {
					try {
						let r = {
							peerId: n,
							status: "fulfilled",
							value: await b(e, {
								target: n,
								...t.metadata === void 0 ? {} : { metadata: t.metadata },
								...t.timeoutMs === void 0 ? {} : { timeoutMs: t.timeoutMs },
								...t.onProgress === void 0 ? {} : { onProgress: t.onProgress },
								...t.signal === void 0 ? {} : { signal: t.signal }
							})
						};
						return t.onResult?.(r), r;
					} catch (e) {
						let r = Y(e, "request failed");
						if (r.kind === "aborted" || !r.kind) throw r;
						let i = r.kind === "timeout" ? {
							peerId: n,
							status: "timeout"
						} : r.kind === "disconnected" ? {
							peerId: n,
							status: "disconnected"
						} : {
							peerId: n,
							status: "rejected",
							error: r
						};
						return t.onResult?.(i), i;
					}
				}))),
				get onRequest() {
					return m;
				},
				set onRequest(e) {
					m = e, v();
				},
				get onReceiveProgress() {
					return u.onReceiveProgress;
				},
				set onReceiveProgress(e) {
					p(e);
				}
			};
			return s.onMessage((e, t, n) => {
				let r = tn(n);
				r && y(e, t, r.m, r.r);
			}), u.action = x, r[t] = u, v(), x;
		},
		makeInternalAction: o,
		handleData: s,
		clearPeer: u
	};
}, on = (e) => e && typeof e == "object" && !Array.isArray(e) && typeof e.k == "string" ? {
	key: e.k,
	...typeof e.s == "string" ? { streamId: e.s } : {},
	...typeof e.t == "string" ? { trackId: e.t } : {},
	...Object.hasOwn(e, "m") ? { metadata: e.m } : {}
} : null, sn = (e) => (t) => {
	let n = e.get(t);
	return n || (n = Me(20), e.set(t, n)), n;
}, cn = () => {
	let e = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
	return {
		getStreamKey: sn(e),
		getTrackKey: sn(t),
		rememberRemoteStream: (e, t, i) => {
			n.set(e, t), i && r.set(i, t);
		},
		getRemoteStream: (e, t) => n.get(e) ?? (t ? r.get(t) : void 0),
		rememberRemoteTrack: (e, t, n, o, s) => {
			let c = {
				track: t,
				stream: n
			};
			i.set(e, c), o && a.set(o, c), s && r.set(s, n);
		},
		getRemoteTrack: (e, t) => i.get(e) ?? (t ? a.get(t) : void 0),
		clearRemote: () => {
			n.clear(), r.clear(), i.clear(), a.clear();
		}
	};
}, ln = ({ iterate: e, isActive: t, getSharedMediaPeer: n }) => {
	let r = {}, i = {}, a = cn(), o = {
		onPeerStream: null,
		onPeerTrack: null
	}, s = (e, r, i, a) => {
		t(e) && (n(e)?.__trysteroMedia?.rememberRemoteStream(r, i, typeof i.id == "string" ? i.id : void 0), o.onPeerStream?.(i, e, a));
	}, c = (e, r, i, a, s) => {
		t(e) && (n(e)?.__trysteroMedia?.rememberRemoteTrack(r, i, a, typeof i.id == "string" ? i.id : void 0, typeof a.id == "string" ? a.id : void 0), o.onPeerTrack?.(i, a, e, s));
	}, l = (t, n, r, i, a, o = {}) => {
		let s = {
			k: n,
			...o,
			...r === void 0 ? {} : { m: r }
		};
		return e(t, async (e, t) => {
			await i(s, e), a(t);
		});
	};
	return {
		addStream: (e, t, n) => l(t.target, a.getStreamKey(e), t.metadata, n, (t) => t.addStream(e), { s: e.id }),
		removeStream: (t, n) => {
			e(n, (e, n) => n.removeStream(t));
		},
		addTrack: (e, t, n, r) => l(n.target, a.getTrackKey(e), n.metadata, r, (n) => n.addTrack(e, t), {
			s: t.id,
			t: e.id
		}),
		removeTrack: (t, n) => {
			e(n, (e, n) => n.removeTrack(t));
		},
		replaceTrack: (e, t, n, r) => l(n.target, a.getTrackKey(t), n.metadata, r, (n) => n.replaceTrack(e, t), { t: e.id }),
		receiveStreamMeta: (e, i) => {
			if (!t(i)) return;
			let a = on(e);
			if (!a) return;
			let o = n(i)?.__trysteroMedia?.getRemoteStream(a.key, a.streamId);
			if (o) {
				s(i, a.key, o, a.metadata);
				return;
			}
			(r[i] ??= []).push(a);
		},
		receiveTrackMeta: (e, r) => {
			if (!t(r)) return;
			let a = on(e);
			if (!a) return;
			let o = n(r)?.__trysteroMedia?.getRemoteTrack(a.key, a.trackId);
			if (o) {
				c(r, a.key, o.track, o.stream, a.metadata);
				return;
			}
			(i[r] ??= []).push(a);
		},
		receiveRemoteStream: (e, n) => {
			if (!t(e)) return;
			let i = r[e]?.shift();
			i && s(e, i.key, n, i.metadata);
		},
		receiveRemoteTrack: (e, n, r) => {
			if (!t(e)) return;
			let a = i[e]?.shift();
			a && c(e, a.key, n, r, a.metadata);
		},
		clearPeer: (e) => {
			delete r[e], delete i[e];
		},
		get onPeerStream() {
			return o.onPeerStream;
		},
		set onPeerStream(e) {
			o.onPeerStream = e;
		},
		get onPeerTrack() {
			return o.onPeerTrack;
		},
		set onPeerTrack(e) {
			o.onPeerTrack = e;
		}
	};
}, un = "beforeunload", dn = 1e4, Q = (e) => "@_" + e, fn = /* @__PURE__ */ new Set(), pn = () => fn.forEach((e) => e()), mn = (e) => (fn.add(e), fn.size === 1 && addEventListener(un, pn), () => {
	fn.delete(e), fn.size || removeEventListener(un, pn);
}), hn = (e, t, n, { onPeerHandshake: r, onHandshakeError: i, handshakeTimeoutMs: a = dn, isPassive: o = !1 } = {}) => {
	let s = {}, c = {}, l = {}, u = {
		onPeerJoin: null,
		onPeerLeave: null
	}, d = K, f = null, p = (e, t, { includePending: n = !1 } = {}) => (e ? Array.isArray(e) ? e : [e] : G(n ? s : c)).flatMap((e) => {
		let r = n ? s[e] : c[e];
		return r ? [Promise.resolve(t(e, r))] : (console.warn(`${U}: no peer with id ${e} found`), []);
	}), m = ln({
		iterate: (e, t) => p(e, (e, n) => t(e, n)),
		isActive: (e) => !!c[e],
		getSharedMediaPeer: (e) => s[e] ?? null
	}), h = an({
		getPeer: (e, t) => (t ? s : c)[e],
		getPeerIds: (e) => G(e ? s : c),
		canReceiveFromPeer: (e, t) => !!f?.canReceiveFromPeer(e, t)
	}), g = h.makeInternalAction, _ = h.handleData, v = h.makeAction, y = (e, t = J("peer disconnected")) => {
		let n = Y(t, "peer disconnected");
		f?.clearPeer(e, n), delete s[e], delete c[e], h.clearPeer(e, n), l[e]?.splice(0).forEach((e) => e.reject(n)), delete l[e], m.clearPeer(e);
	}, b = (e, n, r) => {
		let i = s[e];
		if (!i || n && i !== n) return;
		let a = !!c[e];
		y(e, r), i.destroy(), a && u.onPeerLeave?.(e), t(e);
	}, x = async () => {
		await D.send(""), await new Promise((e) => setTimeout(e, 99)), Fe(s).forEach(([e, t]) => {
			t.destroy(), y(e, J("room left"));
		}), d(), n();
	}, S = g(Q("ping")), C = g(Q("pong")), w = g(Q("signal")), T = g(Q("stream")), E = g(Q("track")), D = g(Q("leave"), {
		sendToPending: !0,
		receiveWhilePending: !0
	}), O = g(Q("hsdata"), {
		sendToPending: !0,
		receiveWhilePending: !0
	}), k = g(Q("hsready"), {
		sendToPending: !0,
		receiveWhilePending: !0
	});
	return f = wt({
		...r === void 0 ? {} : { onPeerHandshake: r },
		...i === void 0 ? {} : { onHandshakeError: i },
		handshakeTimeoutMs: a,
		sendHandshakeData: O.send,
		sendHandshakeReady: k.send,
		onActivate: (e, t) => {
			c[e] = t, u.onPeerJoin?.(e);
		},
		onFailure: (e, t, n) => b(e, t, n)
	}), S.onMessage((e, t) => C.send("", t)), C.onMessage((e, t) => {
		let n = l[t];
		(n?.shift())?.resolve(), n && !n.length && delete l[t];
	}), w.onMessage((e, t) => {
		c[t] && s[t]?.signal(e);
	}), T.onMessage((e, t) => m.receiveStreamMeta(e, t)), E.onMessage((e, t) => m.receiveTrackMeta(e, t)), D.onMessage((e, t) => b(t, void 0, J("peer left room"))), O.onMessage((e, t, n) => f?.receiveHandshakeData(e, t, n)), k.onMessage((e, t) => f?.receiveHandshakeReady(t)), e((e, t) => {
		let n = s[t];
		if (n) {
			if (n === e) return;
			n.destroy(), y(t, J("peer replaced"));
		}
		s[t] = e, f?.addPeer(t, e), e.setHandlers({
			data: (e) => _(t, e),
			stream: (e) => m.receiveRemoteStream(t, e),
			track: (e, n) => m.receiveRemoteTrack(t, e, n),
			signal: (e) => {
				c[t] && w.send(e, t);
			},
			close: () => b(t, e, J("peer disconnected")),
			error: (n) => {
				console.error(`${U} peer error:`, n), b(t, e, n);
			}
		}), f?.start(t, e);
	}), Pe && (d = mn(() => x().catch(K))), {
		makeAction: v,
		leave: x,
		ping: async (e) => {
			if (!c[e]) throw J(`no active peer with id ${e}`);
			let t = Date.now();
			return await new Promise((t, n) => {
				let r = l[e] ??= [], i = () => {
					let t = l[e];
					if (!t) return;
					let n = t.indexOf(a);
					n > -1 && t.splice(n, 1), t.length || delete l[e];
				}, a = {
					resolve: () => {
						i(), t();
					},
					reject: (e) => {
						i(), n(e);
					}
				};
				r.push(a), S.send("", e).catch((e) => a.reject(Y(e, "peer disconnected")));
			}), Date.now() - t;
		},
		isPassive: () => o,
		getPeers: () => Ie(Fe(c).map(([e, t]) => [e, t.connection])),
		addStream: (e, t = {}) => m.addStream(e, t, T.send),
		removeStream: (e, t = {}) => {
			m.removeStream(e, t.target);
		},
		addTrack: (e, t, n = {}) => m.addTrack(e, t, n, E.send),
		removeTrack: (e, t = {}) => {
			m.removeTrack(e, t.target);
		},
		replaceTrack: (e, t, n = {}) => m.replaceTrack(e, t, n, E.send),
		get onPeerJoin() {
			return u.onPeerJoin;
		},
		set onPeerJoin(e) {
			u.onPeerJoin = e, e && G(c).forEach((t) => e(t));
		},
		get onPeerLeave() {
			return u.onPeerLeave;
		},
		set onPeerLeave(e) {
			u.onPeerLeave = e;
		},
		get onPeerStream() {
			return m.onPeerStream;
		},
		set onPeerStream(e) {
			m.onPeerStream = e;
		},
		get onPeerTrack() {
			return m.onPeerTrack;
		},
		set onPeerTrack(e) {
			m.onPeerTrack = e;
		}
	};
}, gn = 1, _n = 2, vn = (e, t) => {
	let n = X(e), r = new Uint8Array(3 + n.byteLength + t.byteLength);
	return r[0] = gn, r[1] = n.byteLength >>> 8 & 255, r[2] = n.byteLength & 255, r.set(n, 3), r.set(t, 3 + n.byteLength), r;
}, yn = (e, t) => {
	let n = X(e), r = new Uint8Array(4 + n.byteLength);
	return r[0] = _n, r[1] = Number(t), r[2] = n.byteLength >>> 8 & 255, r[3] = n.byteLength & 255, r.set(n, 4), r;
}, bn = (e) => {
	let t = new Uint8Array(e);
	if (t.byteLength < 3) return null;
	if (t[0] === gn) {
		let e = (t[1] ?? 0) << 8 | (t[2] ?? 0), n = 3 + e;
		return e <= 0 || t.byteLength < n ? null : {
			type: "room",
			roomToken: He(t.subarray(3, n)),
			payload: t.subarray(n).slice().buffer
		};
	}
	if (t[0] !== _n || t.byteLength < 4) return null;
	let n = (t[2] ?? 0) << 8 | (t[3] ?? 0), r = 4 + n;
	return n <= 0 || t.byteLength < r ? null : {
		type: "presence",
		roomToken: He(t.subarray(4, r)),
		isPresent: t[1] === 1
	};
}, xn = (e) => {
	let { connection: t, channel: n } = e;
	return e.isDead || t.connectionState === "closed" || t.connectionState === "failed" || t.iceConnectionState === "closed" || t.iceConnectionState === "failed" || n?.readyState === "closing" || n?.readyState === "closed";
}, Sn = (e) => {
	if (xn(e)) return "stale";
	let { channel: t } = e;
	return !t || t.readyState !== "open" ? "transient" : "live";
}, Cn = class {
	byApp = {};
	roomPresenceHandlers = {};
	getMap(e) {
		return this.byApp[e] ??= {};
	}
	get(e, t) {
		return this.byApp[e]?.[t];
	}
	isPeerStale(e) {
		return xn(e);
	}
	getHealth(e) {
		return this.isPeerStale(e) ? "stale" : "live";
	}
	setRoomPresenceHandler(e, t) {
		return this.roomPresenceHandlers[e] = t, () => {
			this.roomPresenceHandlers[e] === t && delete this.roomPresenceHandlers[e];
		};
	}
	sendRoomPresence(e, t, n) {
		e.isClosing || e.peer.isDead || e.peer.sendData(yn(t, n));
	}
	clear(e, t, { destroyPeer: n }) {
		let r = this.byApp[e], i = r?.[t];
		if (!i || i.isClosing) return;
		i.idleTimer = q(i.idleTimer), i.isClosing = !0, n && !i.peer.isDead && i.peer.destroy();
		let a = Le(i.bindings);
		i.bindings = {}, i.bindingsByToken = {}, i.controlRoomId = null, delete r[t], a.forEach((e) => {
			e.handlers.close?.(), e.pendingData.length = 0, e.pendingSendData.length = 0, e.pendingTracks.length = 0;
		}), i.media.clearRemote(), i.pendingDataByToken.clear(), i.remoteRoomTokens.clear(), G(r).length === 0 && delete this.byApp[e];
	}
	register(e, t, n, r) {
		let i = this.getMap(e), a = i[t];
		if (a) {
			if (a.idleTimer = q(a.idleTimer), a.peer === n) return a;
			this.clear(e, t, { destroyPeer: !0 });
		}
		let o = {
			appId: e,
			peerId: t,
			peer: n,
			bindings: {},
			bindingsByToken: {},
			pendingDataByToken: /* @__PURE__ */ new Map(),
			remoteRoomTokens: /* @__PURE__ */ new Set(),
			idleTimer: null,
			controlRoomId: null,
			streamOwners: /* @__PURE__ */ new Map(),
			trackOwners: /* @__PURE__ */ new Map(),
			media: cn(),
			idleMs: r,
			isClosing: !1
		};
		return n.setHandlers({
			data: (e) => this.dispatchData(o, e),
			signal: (e) => this.dispatchSignal(o, e),
			close: () => this.clear(e, t, { destroyPeer: !1 }),
			error: (n) => {
				console.error(`${U} peer error:`, n), this.clear(e, t, { destroyPeer: !1 });
			},
			track: (e, t) => this.dispatchTrack(o, e, t)
		}), i[t] = o, o;
	}
	bind(e, t, n, { onDetach: r }) {
		let i = n.bindings[e];
		if (i) return n.idleTimer = q(n.idleTimer), {
			proxy: i.proxy,
			isNew: !1
		};
		let a = {
			roomId: e,
			roomToken: null,
			roomTokenPromise: t,
			handlers: {},
			pendingData: [],
			pendingSendData: [],
			pendingTracks: [],
			detach: K,
			proxy: {}
		}, o = () => {
			n.bindings[e] && (this.pruneRoomOwnership(n, e), delete n.bindings[e], a.roomToken && n.bindingsByToken[a.roomToken] === a && delete n.bindingsByToken[a.roomToken], n.controlRoomId === e && (n.controlRoomId = G(n.bindings)[0] ?? null), r(), this.scheduleIdleTimer(n));
		}, s = {
			created: n.peer.created,
			get connection() {
				return n.peer.connection;
			},
			get channel() {
				return n.peer.channel;
			},
			get isDead() {
				return n.peer.isDead;
			},
			getOffer: (e) => n.peer.getOffer(e),
			signal: (e) => n.peer.signal(e),
			sendData: (e) => {
				if (!a.roomToken) {
					a.pendingSendData.push(e);
					return;
				}
				n.peer.sendData(vn(a.roomToken, e));
			},
			destroy: () => o(),
			setHandlers: (e) => {
				let { signal: t, ...n } = e;
				Object.assign(a.handlers, n), t && (a.handlers.signal = t), this.flushBindingQueues(a);
			},
			offerPromise: n.peer.offerPromise,
			addStream: (t) => {
				let r = n.streamOwners.get(t) ?? /* @__PURE__ */ new Set(), i = r.size === 0;
				r.add(e), n.streamOwners.set(t, r), i && n.peer.addStream(t);
			},
			removeStream: (t) => {
				let r = n.streamOwners.get(t);
				r && (r.delete(e), r.size === 0 && (n.streamOwners.delete(t), n.peer.removeStream(t)));
			},
			addTrack: (t, r) => {
				let i = n.trackOwners.get(t) ?? {
					stream: r,
					rooms: /* @__PURE__ */ new Set()
				}, a = i.rooms.size === 0;
				return i.stream = r, i.rooms.add(e), n.trackOwners.set(t, i), a ? n.peer.addTrack(t, r) : n.peer.connection.getSenders().find((e) => e.track === t) ?? n.peer.addTrack(t, r);
			},
			removeTrack: (t) => {
				let r = n.trackOwners.get(t);
				r && (r.rooms.delete(e), r.rooms.size === 0 && (n.trackOwners.delete(t), n.peer.removeTrack(t)));
			},
			replaceTrack: (e, t) => {
				let r = n.trackOwners.get(e);
				if (r) {
					n.trackOwners.delete(e);
					let i = n.trackOwners.get(t) ?? {
						stream: r.stream,
						rooms: /* @__PURE__ */ new Set()
					};
					r.rooms.forEach((e) => i.rooms.add(e)), n.trackOwners.set(t, i);
				}
				return n.peer.replaceTrack(e, t);
			},
			__trysteroMedia: n.media
		};
		return a.proxy = s, a.detach = o, n.bindings[e] = a, n.controlRoomId ??= e, n.idleTimer = q(n.idleTimer), t.then((t) => {
			if (n.isClosing || n.bindings[e] !== a) return;
			a.roomToken = t, n.bindingsByToken[t] = a;
			let r = n.pendingDataByToken.get(t);
			r?.length && (a.pendingData.push(...r), n.pendingDataByToken.delete(t)), a.pendingSendData.splice(0).forEach((e) => n.peer.sendData(vn(t, e))), this.flushBindingQueues(a);
		}), {
			proxy: s,
			isNew: !0
		};
	}
	pruneRoomOwnership(e, t) {
		e.streamOwners.forEach((n, r) => {
			n.delete(t), n.size === 0 && (e.streamOwners.delete(r), e.peer.removeStream(r));
		}), e.trackOwners.forEach((n, r) => {
			n.rooms.delete(t), n.rooms.size === 0 && (e.trackOwners.delete(r), e.peer.removeTrack(r));
		});
	}
	scheduleIdleTimer(e) {
		e.isClosing || G(e.bindings).length > 0 || (e.idleTimer = q(e.idleTimer), e.idleTimer = setTimeout(() => {
			let t = this.byApp[e.appId]?.[e.peerId];
			!t || G(t.bindings).length > 0 || this.clear(e.appId, e.peerId, { destroyPeer: !0 });
		}, e.idleMs));
	}
	getSignalBinding(e) {
		if (e.controlRoomId) {
			let t = e.bindings[e.controlRoomId];
			if (t?.handlers.signal) return t;
		}
		let t = Le(e.bindings).find((e) => !!e.handlers.signal);
		return t ? (e.controlRoomId = t.roomId, t) : null;
	}
	flushBindingQueues(e) {
		let { handlers: t } = e;
		t.data && e.pendingData.length > 0 && e.pendingData.splice(0).forEach((e) => t.data?.(e)), (t.track || t.stream) && e.pendingTracks.length && e.pendingTracks.splice(0).forEach(({ track: e, stream: n }) => {
			t.track?.(e, n), t.stream?.(n);
		});
	}
	dispatchData(e, t) {
		let n = bn(t);
		if (!n) return;
		if (n.type === "presence") {
			n.isPresent ? e.remoteRoomTokens.add(n.roomToken) : e.remoteRoomTokens.delete(n.roomToken), this.roomPresenceHandlers[e.appId]?.(e.peerId, n.roomToken, n.isPresent);
			return;
		}
		let r = e.bindingsByToken[n.roomToken];
		if (!r) {
			let t = e.pendingDataByToken.get(n.roomToken) ?? [];
			t.push(n.payload), e.pendingDataByToken.set(n.roomToken, t);
			return;
		}
		r.handlers.data ? r.handlers.data(n.payload) : r.pendingData.push(n.payload);
	}
	dispatchSignal(e, t) {
		this.getSignalBinding(e)?.handlers.signal?.(t);
	}
	dispatchTrack(e, t, n) {
		Le(e.bindings).forEach((e) => {
			if (e.handlers.track || e.handlers.stream) {
				e.handlers.track?.(t, n), e.handlers.stream?.(n);
				return;
			}
			e.pendingTracks.push({
				track: t,
				stream: n
			});
		});
	}
}, wn = 23333, Tn = 12, En = 7533, Dn = 23333, On = "__legacy__", kn = "offer-placeholder", An = [
	"offer",
	"answer",
	"candidate"
], jn = (e) => {
	if (typeof e == "string") try {
		let t = qe(e);
		return t && typeof t == "object" ? t : null;
	} catch {
		return null;
	}
	return e && typeof e == "object" ? e : null;
}, Mn = (e, t) => typeof e[t] == "string" && e[t] ? e[t] : void 0, Nn = (e) => An.some((t) => t in e && (typeof e[t] != "string" || e[t] === "")), Pn = (e, t, n, r, i, a) => {
	e.toCipher(t).then((t) => {
		!e.isLeaving() && a() && r(n, Z(i(t.sdp)));
	});
}, Fn = () => ({
	status: "idle",
	offerPeer: null,
	offerId: null,
	offerSdp: null,
	offerInitPromise: null,
	offerAnswered: !1,
	offerRelays: [],
	offerSignalRelays: [],
	offerSignalBacklog: [],
	offerRelayTimers: [],
	offerExpiryTimer: null,
	connectedPeer: null,
	connectedPeerUnhealthySinceMs: null,
	answeringExpiryTimer: null,
	answeringPeer: null,
	answerSent: !1,
	connectionErrorReported: !1,
	pendingCandidates: {}
}), In = (e) => [...e.turnConfig ?? [], ...e.rtcConfig?.iceServers ?? []].some(({ urls: e }) => (Array.isArray(e) ? e : [e]).some((e) => /^turns?:/i.test(e))), Ln = (e, t) => `could not connect to peer ${e} after exchanging SDP; ${In(t) ? "check that your TURN server URLs and credentials are reachable by both peers" : "configure TURN servers with turnConfig or rtcConfig.iceServers"}`, Rn = (e, t, n) => {
	e.isLeaving() || t.connectedPeer || t.connectionErrorReported || (t.connectionErrorReported = !0, e.onJoinError?.({
		error: Ln(n, e.config),
		appId: e.appId,
		peerId: n,
		roomId: e.roomId
	}));
}, zn = (e, t) => e[t] ??= Fn(), $ = (e) => {
	e.status = e.connectedPeer ? "connected" : e.answeringPeer ? "answering" : e.offerPeer || e.offerRelays.some(Boolean) ? "offering" : "idle";
}, Bn = (e, t) => {
	e.answeringPeer === t && (e.answeringExpiryTimer = q(e.answeringExpiryTimer), e.answeringPeer = null, e.answerSent = !1, $(e));
}, Vn = (e, t, n) => {
	e.connectedPeer && (e.connectedPeer.isDead || e.connectedPeer.destroy(), e.connectedPeer = null, e.connectedPeerUnhealthySinceMs = null, $(e));
}, Hn = (e, t) => {
	e.offerRelayTimers[t] = q(e.offerRelayTimers[t]), e.offerRelays[t] && (e.offerRelays[t] = void 0, $(e));
}, Un = (e, t) => {
	e?.offerRelays[t] === kn && Hn(e, t);
}, Wn = (e) => {
	if (e.isDead || e.connection.connectionState === "closed") return !0;
	try {
		return !!e.connection.remoteDescription;
	} catch {
		return !0;
	}
}, Gn = (e, t) => {
	let n = e.offerAnswered;
	e.offerExpiryTimer = q(e.offerExpiryTimer), e.offerInitPromise = null, e.offerRelays.forEach((t, n) => Hn(e, n)), e.offerRelays = [], e.offerSignalRelays = [], e.offerRelayTimers = [], e.offerSignalBacklog = [], e.offerPeer && e.offerPeer !== e.connectedPeer && (n || Wn(e.offerPeer) ? e.offerPeer.isDead || e.offerPeer.destroy() : t.recycle(e.offerPeer)), e.offerPeer = null, e.offerId = null, e.offerSdp = null, e.offerAnswered = !1, e.connectionErrorReported = !1, $(e);
}, Kn = (e, t, n, r) => {
	q(t.answeringExpiryTimer), t.answeringExpiryTimer = setTimeout(() => {
		let t = e.peerStates[n];
		t && !t.connectedPeer && t.answeringPeer === r && (t.answerSent && Rn(e, t, n), r.destroy(), Bn(t, r), e.checkDeactivate());
	}, Dn);
}, qn = async (e, t, n) => {
	let r = n ? [n, On] : [On];
	for (let n of r) {
		let r = e.pendingCandidates[n];
		if (r?.length) {
			delete e.pendingCandidates[n];
			for (let e of r) await t.signal(e);
		}
	}
}, Jn = (e, t, n, r = _t) => {
	q(t.offerExpiryTimer);
	let i = t.offerId;
	t.offerExpiryTimer = setTimeout(() => {
		let t = e.peerStates[n];
		t && !t.connectedPeer && t.offerId === i && (t.offerAnswered && Rn(e, t, n), Gn(t, e.offerPool), e.checkDeactivate());
	}, r);
}, Yn = (e, t, n, r) => t.offerPeer && t.offerId && t.offerSdp ? Promise.resolve({
	peer: t.offerPeer,
	offer: t.offerSdp,
	offerId: t.offerId
}) : (t.offerInitPromise ||= (async () => {
	let i = (await e.offerPool.checkout(1, !1, e.encryptOffer))[0];
	if (!i) throw J("failed to allocate offer peer");
	let { peer: a, offer: o } = i;
	t.offerPeer = a, t.offerId = Me(Tn), t.offerSdp = o, t.offerAnswered = !1, t.connectionErrorReported = !1, t.offerSignalBacklog = [], $(t);
	let s = () => {
		t.offerPeer === a && !t.connectedPeer && (t.offerAnswered && Rn(e, t, n), Gn(t, e.offerPool)), e.disconnectPeer(a, n), e.checkDeactivate();
	};
	return a.setHandlers({
		connect: () => e.connectPeer(a, n, r),
		signal: (e) => {
			t.offerPeer === a && (t.offerSignalBacklog.push(e), t.offerSignalRelays.forEach((t) => t?.(e)));
		},
		close: s,
		error: s
	}), Jn(e, t, n), {
		peer: a,
		offer: o,
		offerId: t.offerId
	};
})().finally(() => t.offerInitPromise = null), t.offerInitPromise), Xn = async (e, t, n, r, i) => {
	if (r) {
		e.attachSharedPeerToRoom(n, r);
		return;
	}
	let a = e.peerStates[n];
	if (!a || a.connectedPeer || a.answeringPeer || a.offerAnswered) {
		Un(a, t);
		return;
	}
	if (a.offerRelays[t] !== kn) return;
	let [o, s] = await Ne([ut(We(e.rootTopicPlaintext, n)), Yn(e, a, n, t)]);
	if (e.isLeaving()) return;
	if (a.connectedPeer || a.answeringPeer || a.offerAnswered || a.offerRelays[t] !== kn) {
		Un(a, t);
		return;
	}
	a.offerRelayTimers[t] = q(a.offerRelayTimers[t]), a.offerRelays[t] = !0, $(a), a.offerRelayTimers[t] = setTimeout(() => er(e, n, t), (e.announceIntervals[t] ?? e.announceIntervalMs) * .9);
	let c = !1;
	a.offerSignalRelays[t] = (t) => {
		c && (e.isLeaving() || a.connectedPeer || a.offerPeer !== s.peer || a.offerId !== s.offerId || t.type !== "candidate" || Pn(e, t, o, i, (t) => ({
			peerId: W,
			offerId: s.offerId,
			candidate: t,
			...e.isPassive ? { passive: !0 } : {}
		}), () => !a.connectedPeer && a.offerPeer === s.peer && a.offerId === s.offerId));
	}, i(o, Z({
		peerId: W,
		offerId: s.offerId,
		offer: s.offer,
		...e.isPassive ? { passive: !0 } : {}
	})), c = !0, a.offerSignalBacklog.forEach((e) => a.offerSignalRelays[t]?.(e));
}, Zn = async (e, t, n, r, i, a, o) => {
	let s = zn(e.peerStates, n);
	if (s.answeringPeer || s.offerAnswered) return;
	let c = !!(s.offerPeer || s.offerRelays.some(Boolean));
	if ((c || a) && W < n) return;
	c && Gn(s, e.offerPool);
	let l = e.initPeer(!1, e.config);
	s.answeringPeer = l, s.answerSent = !1, s.connectionErrorReported = !1, Kn(e, s, n, l), $(s);
	let u = () => {
		s.answeringPeer === l && !s.connectedPeer && s.answerSent && Rn(e, s, n), Bn(s, l), e.disconnectPeer(l, n), e.checkDeactivate();
	};
	l.setHandlers({
		connect: () => e.connectPeer(l, n, t),
		close: u,
		error: u
	});
	let d;
	try {
		d = await e.toPlain({
			type: "offer",
			sdp: r
		});
	} catch {
		Bn(s, l), e.onJoinError?.({
			error: "incorrect room password when decrypting offer",
			appId: e.appId,
			peerId: n,
			roomId: e.roomId
		});
		return;
	}
	if (l.isDead) {
		Bn(s, l);
		return;
	}
	let f = await ut(We(e.rootTopicPlaintext, n));
	e.isLeaving() || (l.setHandlers({ signal: (t) => {
		e.isLeaving() || s.answeringPeer !== l || l.isDead || (t.type === "answer" || t.type === "candidate") && Pn(e, t, f, o, (n) => {
			let r = { peerId: W };
			return t.type === "answer" ? (s.answerSent = !0, r.answer = n) : r.candidate = n, i && (r.offerId = i), e.isPassive && (r.passive = !0), r;
		}, () => s.answeringPeer === l && !l.isDead);
	} }), await l.signal(d), await qn(s, l, i));
}, Qn = async (e, t, n, r, i) => {
	let a;
	try {
		a = await e.toPlain({
			type: Re,
			sdp: n
		});
	} catch {
		return;
	}
	let o = zn(e.peerStates, t), s = r && o?.offerPeer && o.offerId === r ? o.offerPeer : null, c = o?.answeringPeer ?? null, l = !r && o?.offerPeer ? o.offerPeer : null, u = i && !i.isDead ? i : s ?? c ?? l;
	if (!u || u.isDead) {
		let e = r ?? On;
		(o.pendingCandidates[e] ??= []).push(a);
		return;
	}
	u.signal(a);
}, $n = async (e, t, n, r, i, a) => {
	let o;
	try {
		o = await e.toPlain({
			type: "answer",
			sdp: r
		});
	} catch {
		e.onJoinError?.({
			error: "incorrect room password when decrypting answer",
			appId: e.appId,
			peerId: n,
			roomId: e.roomId
		});
		return;
	}
	if (a) e.offerPool.claimLeased(a), a.setHandlers({
		connect: () => e.connectPeer(a, n, t),
		close: () => e.disconnectPeer(a, n)
	}), a.signal(o);
	else {
		let t = e.peerStates[n];
		if (!t || !t.offerPeer || t.offerAnswered || i && t.offerId && i !== t.offerId || t.offerPeer.isDead) return;
		t.offerAnswered = !0, Jn(e, t, n, wn), t.offerPeer.signal(o);
	}
}, er = (e, t, n) => {
	let r = e.peerStates[t];
	r && !r.connectedPeer && r.offerRelays[n] && (Hn(r, n), e.checkDeactivate());
}, tr = (e) => (t) => async (n, r, i) => {
	if (e.isLeaving()) return;
	let a = jn(r);
	if (!a || Nn(a)) return;
	let o = Mn(a, "peerId") ?? "", s = Mn(a, "offer"), c = Mn(a, "answer"), l = Mn(a, "candidate"), u = Mn(a, "offerId"), d = a.peer, f = a.hasOutgoingOffer === !0, p = a.passive === !0;
	if (!o || o === W) return;
	let [m, h] = await Ne([e.rootTopicP, e.selfTopicP]);
	if (e.isLeaving() || n !== m && n !== h || e.isPassive && p || (e.isPassive && !e.isActive && !c && !l && (e.isActive = !0, e.requeueAnnounce?.()), e.isPassive && !e.isActive)) return;
	let g = e.peerStates[o], _ = g?.connectedPeer;
	if (_ && g) {
		let e = Sn(_);
		if (e === "live") {
			g.connectedPeerUnhealthySinceMs = null;
			return;
		}
		if (e === "stale") Vn(g, o, "message-from-stale-peer");
		else {
			let e = Date.now(), t = g.connectedPeerUnhealthySinceMs ?? e;
			if (g.connectedPeerUnhealthySinceMs = t, e - t < En) return;
			Vn(g, o, "message-from-prolonged-disconnect");
		}
	}
	let v = e.sharedPeers.get(e.appId, o);
	v && e.sharedPeers.getHealth(v.peer) === "stale" && (e.sharedPeers.clear(e.appId, o, { destroyPeer: !0 }), v = void 0);
	let y = !(!o || s || c || l);
	if (y && !v) {
		let n = zn(e.peerStates, o), r = W < o;
		if (n.answeringPeer || n.connectedPeer || n.offerAnswered) return;
		if (!r && !n.offerPeer) {
			let t = await ut(We(e.rootTopicPlaintext, o));
			!e.isLeaving() && !n.connectedPeer && i(t, Z({ peerId: W }));
			return;
		}
		if (n.offerRelays[t]) return;
		n.offerRelays[t] = kn, $(n);
	}
	if (v && (s || c || l)) {
		if (v.bindings[e.roomId]) return;
		e.attachSharedPeerToRoom(o, v);
		return;
	}
	if (y) return Xn(e, t, o, v, i);
	if (s) return Zn(e, t, o, s, u, f, i);
	if (l) return Qn(e, o, l, u, d);
	if (c) return $n(e, t, o, c, u, d);
}, nr = 5333, rr = [
	233,
	533,
	1333
], ir = 7533, ar = 123333, or = ({ init: e, subscribe: t, announce: n, deactivate: r }) => {
	let i = {}, a = {}, o = {}, s = {}, c = new Cn(), l = () => Le(i).some((e) => G(e).length > 0), u = (e) => a[e] ??= {}, d = (e) => o[e] ??= {}, f = (e, t, n) => {
		c.getHealth(e.peer) === "live" && c.sendRoomPresence(e, t, n);
	}, p = (e, t) => {
		Fe(a[e] ?? {}).forEach(([n, r]) => {
			if (!r.shouldAdvertise()) return;
			let { roomToken: i, roomTokenPromise: o } = r;
			if (i) {
				f(t, i, !0);
				return;
			}
			o.then((i) => {
				a[e]?.[n] === r && r.roomToken === i && (c.get(e, t.peerId) !== t || t.isClosing || r.shouldAdvertise() && f(t, i, !0));
			});
		});
	}, m = (e, t, n) => Le(c.getMap(e)).forEach((e) => f(e, t, n)), h = (e) => {
		s[e] || (s[e] = c.setRoomPresenceHandler(e, (t, n, r) => {
			if (!r) return;
			let i = c.get(e, t), s = o[e]?.[n];
			i && s && a[e]?.[s]?.attachSharedPeerToRoom(t, i);
		}));
	}, g = (e) => {
		i[e] && G(i[e]).length > 0 || (s[e]?.(), delete s[e], delete a[e], delete o[e]);
	}, _ = !1, v = [], y = null, b = K;
	return (s, f, x) => {
		if (!s) throw J("requires a config map as the first argument");
		if (x && typeof x != "object") throw J("third argument must be a callbacks object");
		let { appId: S } = s, C = x?.onJoinError, w = x?.onPeerHandshake, T = x?.handshakeTimeoutMs;
		if (!S) throw J("config map is missing appId field");
		if (!f) throw J("roomId argument required");
		if (T !== void 0 && (!Number.isFinite(T) || T <= 0)) throw J("handshakeTimeoutMs must be a positive number");
		if (i[S]?.[f]) return i[S][f];
		h(S);
		let E = We(U, S, f), D = ut(E), O = ut(We(E, W)), k = dt(s.password ?? "", S, f), ee = ft(S, f), A = s._test_only_sharedPeerIdleMs ?? ar, j = !1, te = (e) => async (t) => ({
			type: t.type,
			sdp: await e(k, t.sdp)
		}), M = te(gt), N = te(ht), P = c.getMap(S), ne = () => Nt(!0, s), F = !1;
		y ||= new bt(ne);
		let I = y, L = async (e) => {
			let t = await e.getOffer(Date.now() - e.created > _t);
			if (!t || t.type !== "offer") throw J("failed to get offer for peer");
			return (await N(t)).sdp;
		}, re = (e, t) => {
			let n = zn(V.peerStates, e);
			n.answeringExpiryTimer = q(n.answeringExpiryTimer), n.answeringPeer = null;
			let { proxy: r, isNew: i } = c.bind(f, ee, t, { onDetach: () => {
				let n = V.peerStates[e];
				n?.connectedPeer === t.peer && (n.connectedPeer = null, n.connectedPeerUnhealthySinceMs = null, $(n));
			} });
			n.connectedPeer = t.peer, n.connectedPeerUnhealthySinceMs = null, $(n), i && me(r, e), Gn(n, I);
		}, ie = (e, t, n) => {
			if (j) {
				e.destroy();
				return;
			}
			let r = zn(V.peerStates, t);
			if (r.connectedPeer) {
				let n = P[t];
				if (n && r.connectedPeer === n.peer && n.bindings[f]) return;
				r.connectedPeer !== e && !e.isDead && e.destroy();
				return;
			}
			let i = P[t];
			if (i && c.getHealth(i.peer) === "stale" && (c.clear(S, t, { destroyPeer: !0 }), i = void 0), i && i.peer !== e) {
				e.isDead || e.destroy(), re(t, i);
				return;
			}
			let a = !i;
			i ||= c.register(S, t, e, A), re(t, i), a && p(S, i);
		}, ae = (e, t) => {
			if (j) return;
			let n = V.peerStates[t];
			n?.connectedPeer === e && (Vn(n, t, "close-event"), se(), !R && F && V.requeueAnnounce?.());
		}, R = !!s.passive, z = null, B, oe = K, se = () => {
			if (!R || !V.isActive) return;
			let e = !1;
			Fe(V.peerStates).forEach(([t, n]) => {
				n.connectedPeer || n.answeringPeer || n.offerInitPromise || n.offerPeer || n.offerRelays.some(Boolean) ? e = !0 : n.status === "idle" && delete V.peerStates[t];
			}), e || (V.isActive = !1, B = q(B), H.forEach(q), H.length = 0, oe(), z?.roomToken && m(S, z.roomToken, !1));
		}, V = {
			appId: S,
			roomId: f,
			config: s,
			peerStates: {},
			rootTopicPlaintext: E,
			rootTopicP: D,
			selfTopicP: O,
			toPlain: M,
			toCipher: N,
			isLeaving: () => j,
			isPassive: R,
			isActive: !R,
			onJoinError: C,
			sharedPeers: c,
			offerPool: I,
			encryptOffer: L,
			initPeer: Nt,
			connectPeer: ie,
			disconnectPeer: ae,
			attachSharedPeerToRoom: re,
			checkDeactivate: se,
			announceIntervals: [],
			announceIntervalMs: nr
		}, ce = {
			config: s,
			appId: S,
			roomId: f,
			isPassive: R
		}, le = tr(V);
		if (!_) {
			let t = e(s);
			v = (Array.isArray(t) ? t : [t]).map((e) => Promise.resolve(e)), _ = !0, b = s.relayConfig?.manualReconnection ? K : it();
		}
		!R && !I.isActive && I.warmup(), V.announceIntervals = v.map(() => nr);
		let ue = v.map(() => nr), de = v.map(() => 0), fe = v.map(() => 0), H = [], pe = v.map(async (e, n) => t(await e, await D, await O, le(n), (e) => I.getOffers(e, L), ce));
		Ne([D, O]).then(([e, t]) => {
			if (j) return;
			let i = async (r, a) => {
				if (j || R && !V.isActive) return;
				let o = R ? { passive: !0 } : void 0, c;
				try {
					c = await n(r, e, t, o, ce), fe[a] = 0;
				} catch (e) {
					let t = fe[a] ?? 0;
					t === 0 && s.relayConfig?.warnOnRelayFailure !== !1 && console.warn(`${U}: announce failed - ${ze(e, "")}`), fe[a] = t + 1;
				}
				if (j || R && !V.isActive || c && typeof c != "number" && "stopAnnouncing" in c) return;
				typeof c == "number" ? (V.announceIntervals[a] = c, ue[a] = c) : c && (ue[a] = c.nextAnnounceMs, F ||= c.reannounceOnDisconnect === !0);
				let l = de[a] ?? 0;
				de[a] = l + 1;
				let u = ue[a] ?? nr, d = rr[l];
				H[a] = setTimeout(() => {
					i(r, a);
				}, typeof d == "number" ? Math.min(u, d) : u);
			};
			oe = () => {
				r && v.forEach(async (n) => {
					let i = await n;
					j || r(i, e, t, ce);
				});
			}, V.requeueAnnounce = () => {
				H.forEach(q), H.length = 0, B = q(B), I.isActive || I.warmup(), z?.roomToken && m(S, z.roomToken, !0), B = setTimeout(se, ir), v.forEach(async (e, t) => {
					let n = await e;
					n && !j && (de[t] = 0, i(n, t));
				});
			}, pe.forEach(async (e, t) => {
				if (await e, j) return;
				let n = await v[t];
				n && !j && (!R || V.isActive) && i(n, t);
			});
		});
		let me = K, { compose: he } = St(s.password ?? "", S, f), ge = he(w), _e = {
			...ge ? { onPeerHandshake: ge } : {},
			...T === void 0 ? {} : { handshakeTimeoutMs: T },
			isPassive: R,
			onHandshakeError: (e, t) => C?.({
				error: t.replace(/^handshake failed: /, ""),
				appId: S,
				peerId: e,
				roomId: f
			})
		};
		i[S] ??= {};
		let ve = u(S), ye = hn((e) => me = e, (e) => {
			if (j) return;
			let t = V.peerStates[e];
			t?.connectedPeer && (t.connectedPeer = null, $(t), se());
		}, () => {
			j = !0, me = K;
			let e = a[S]?.[f];
			e?.roomToken && (m(S, e.roomToken, !1), delete o[S]?.[e.roomToken], o[S] && !G(o[S]).length && delete o[S]), a[S] && (delete a[S][f], G(a[S]).length || delete a[S]), Fe(V.peerStates).forEach(([e, t]) => {
				if (t.answeringExpiryTimer = q(t.answeringExpiryTimer), t.connectedPeer && !t.connectedPeer.isDead) {
					let n = P[e];
					(!n || n.peer !== t.connectedPeer) && t.connectedPeer.destroy();
				}
				t.answeringPeer && !t.answeringPeer.isDead && t.answeringPeer.destroy(), Gn(t, I), t.connectedPeer = null, t.answeringPeer = null, $(t);
			}), i[S] && (delete i[S][f], G(i[S]).length === 0 && delete i[S]), H.forEach(q), B = q(B), pe.forEach(async (e) => {
				(await e)();
			}), !l() && (_ = !1, I.destroy(), y = null, b(), g(S));
		}, _e);
		return z = {
			roomToken: null,
			roomTokenPromise: ee,
			attachSharedPeerToRoom: re,
			shouldAdvertise: () => !R || V.isActive
		}, ve[f] = z, ee.then((e) => {
			let t = z;
			t && !j && a[S]?.[f] === t && (t.roomToken = e, d(S)[e] = f, Le(P).forEach((t) => {
				t.remoteRoomTokens.has(e) && re(t.peerId, t);
			}), (!R || V.isActive) && m(S, e, !0));
		}), i[S][f] = ye;
	};
}, sr = [
	"offer",
	"answer",
	"candidate"
], cr = 6e4, lr = (e) => {
	if (typeof e == "string") try {
		let t = qe(e);
		return t && typeof t == "object" ? t : null;
	} catch {
		return null;
	}
	return e;
}, ur = (e, t) => typeof e[t] == "string" && e[t] ? e[t] : void 0, dr = (e) => sr.some((t) => t in e && (typeof e[t] != "string" || e[t] === "")), fr = (e) => {
	let t = lr(e);
	if (!t || dr(t)) return !1;
	let n = ur(t, "peerId");
	return !(!n || n === W || t.passive === !0 || ur(t, "answer") || ur(t, "candidate"));
}, pr = (e) => {
	if (!e) throw J("topic strategy missing room context");
	return e;
}, mr = (e, t, n, r) => ({
	kind: t,
	appId: e.appId,
	roomId: e.roomId,
	rootTopic: n,
	selfTopic: r
}), hr = (e, t, n, r) => ({
	kind: t,
	appId: e.appId,
	roomId: e.roomId,
	rootTopic: n,
	selfTopic: r
}), gr = ({ steadyAnnounceIntervalMs: e = cr, reannounceOnDisconnect: t = !0, init: n, subscribeTopic: r, publishTopic: i, unpublishTopic: a }) => or({
	init: n,
	subscribe: async (e, t, n, a, o, s) => {
		let c = pr(s), l = (r, a) => void i(e, r, a, hr(c, "signal", t, n)), u = null, d = !1, f = null, p = !1, m = (e) => {
			d || (d = !0, e());
		}, h = () => (f ||= Promise.resolve(r(e, n, (e, t) => {
			p || a(e, t, l);
		}, mr(c, "self", t, n))).then((e) => {
			u = e, p && m(e);
		}), f);
		c.isPassive || await h();
		let g = await r(e, t, async (e, t) => {
			p || (c.isPassive && fr(t) && await h(), p || await a(e, t, l));
		}, mr(c, "root", t, n));
		return () => {
			p = !0, u && m(u), g();
		};
	},
	announce: async (n, r, a, o, s) => {
		let c = pr(s), l = await i(n, r, Z({
			peerId: W,
			...o
		}), hr(c, "announce", r, a));
		return typeof l == "number" || l !== void 0 && "stopAnnouncing" in l ? l : {
			nextAnnounceMs: l?.nextAnnounceMs ?? e,
			reannounceOnDisconnect: l?.reannounceOnDisconnect ?? t
		};
	},
	...a ? { deactivate: (e, t, n, r) => a(e, t, hr(pr(r), "announce", t, n)) } : {}
}), _r = rt((e) => e.socket), vr = 5, yr = "x", br = "EVENT", { secretKey: xr, publicKey: Sr } = Se.keygen(), Cr = Ue(Sr), wr = {}, Tr = {}, Er = {}, Dr = 250, Or = 6e4, kr = 9e5, Ar = 5333, jr = /* @__PURE__ */ new WeakMap(), Mr = /* @__PURE__ */ new WeakSet(), Nr = /* @__PURE__ */ new WeakMap(), Pr = (e) => {
	let t = jr.get(e), n = Math.min(t?.delayMs ? Math.max(Or, t.delayMs * 2) : Or, kr);
	return jr.set(e, {
		delayMs: n,
		untilMs: Date.now() + n
	}), n;
}, Fr = (e) => {
	let t = jr.get(e);
	if (!t) return 0;
	let n = t.untilMs - Date.now();
	return n > 0 ? n : 0;
}, Ir = (e) => ({ nextAnnounceMs: e }), Lr = { stopAnnouncing: !0 }, Rr = (e) => {
	if (Mr.has(e)) return !1;
	let t = Nr.get(e);
	return t && (clearTimeout(t.timer), Nr.delete(e)), Mr.add(e), jr.delete(e), e.close?.(), !0;
}, zr = (e, t) => {
	let n = Nr.get(e);
	n && (clearTimeout(n.timer), n.eventIds.add(t));
	let r = n?.eventIds ?? /* @__PURE__ */ new Set([t]), i = setTimeout(() => {
		Nr.delete(e);
	}, Ar);
	Nr.set(e, {
		eventIds: r,
		timer: i
	});
}, Br = (e, t) => {
	let n = Nr.get(e);
	return n?.eventIds.has(t) ? (clearTimeout(n.timer), Nr.delete(e), !0) : !1;
}, Vr = () => Math.floor(Date.now() / 1e3), Hr = (e) => Er[e] ??= Je(e, 1e4) + 2e4, Ur = async (e, t) => {
	let n = {
		kind: Hr(e),
		tags: [[yr, e]],
		created_at: Vr(),
		content: t,
		pubkey: Cr
	}, r = await lt("SHA-256", Z([
		0,
		n.pubkey,
		n.created_at,
		n.kind,
		n.tags,
		n.content
	]));
	return Z([br, {
		...n,
		id: Ue(r),
		sig: Ue(await Se.signAsync(r, xr))
	}]);
}, Wr = {}, Gr = (e) => {
	e.flushWaiters.forEach((e) => e()), e.flushWaiters.clear();
}, Kr = (e, t, n) => {
	let r = Wr[e.url] ??= {
		subIds: [],
		topics: /* @__PURE__ */ new Map(),
		updateTimer: null,
		flushWaiters: /* @__PURE__ */ new Set()
	};
	r.topics.set(t, n), Jr(e, r);
}, qr = (e, t) => {
	let n = Wr[e.url];
	n && (n.topics.delete(t), n.topics.size === 0 ? (n.updateTimer !== null && (clearTimeout(n.updateTimer), n.updateTimer = null), Gr(n), n.subIds.forEach((t) => e.send(Z(["CLOSE", t]))), delete Wr[e.url]) : Jr(e, n));
}, Jr = (e, t) => {
	t.updateTimer === null && (t.updateTimer = setTimeout(() => {
		t.updateTimer = null;
		try {
			Xr(e);
		} finally {
			Gr(t);
		}
	}, 0));
}, Yr = (e) => {
	let t = Wr[e.url];
	return !t || t.updateTimer === null ? Promise.resolve() : new Promise((e) => t.flushWaiters.add(e));
}, Xr = (e) => {
	let t = Wr[e.url];
	if (!t || t.topics.size === 0) return;
	let n = [...t.topics.keys()], r = [], i = Vr();
	for (let e = 0; e < n.length; e += Dr) r.push(n.slice(e, e + Dr));
	for (; t.subIds.length > r.length;) {
		let n = t.subIds.pop();
		n && e.send(Z(["CLOSE", n]));
	}
	r.forEach((n, r) => {
		let a = t.subIds[r] ??= Me(64);
		e.send(Z([
			"REQ",
			a,
			{
				kinds: [...new Set(n.map(Hr))],
				since: i,
				"#x": n
			}
		]));
	});
}, Zr = (e) => {
	let t = Wr[e.url];
	t && t.topics.size > 0 && Xr(e);
}, Qr = gr({
	init: (e) => Ke(e, $r, vr, !0).map((t) => {
		let n = _r.register(t, () => nt(t, (t) => {
			let [r, i, a, o] = qe(t);
			if (r !== br) {
				let t = `${U}: relay failure from ${n.url} - `, s = r === "CLOSED" && typeof a == "string" ? a : o, c = r === "OK" && a === !1, l = c && s?.startsWith("rate-limited:"), u = c && s?.startsWith("duplicate:"), d = r === "CLOSED" || c && !l && !u, f = r === "OK" && Br(n, i);
				if (d && !Rr(n)) return;
				l ? Pr(n) : f && jr.delete(n), !u && e.relayConfig?.warnOnRelayFailure !== !1 && (r === "NOTICE" ? console.warn(t + i) : (c || r === "CLOSED") && console.warn(t + s));
				return;
			}
			if (a && typeof a == "object" && "content" in a) {
				let { content: e } = a, t = Tr[i];
				if (t) {
					t(wr[i] ?? "", e);
					return;
				}
				let r = Wr[n.url];
				if (r?.subIds.includes(i) && a.tags) {
					let t = a.tags.find((e) => e[0] === yr);
					t?.[1] && r.topics.get(t[1])?.(t[1], e);
				}
			}
		}, () => Zr(n)));
		return n.ready;
	}),
	subscribeTopic: (e, t, n, r) => {
		Kr(e, t, (e, t) => void n(e, t));
		let i = () => {
			qr(e, t);
		};
		return r.kind === "root" ? Yr(e).then(() => i) : i;
	},
	publishTopic: async (e, t, n, r) => {
		if (Mr.has(e) || e.isClosed) return r.kind === "announce" ? Lr : void 0;
		if (r.kind === "announce") {
			let t = Fr(e);
			if (t > 0) return Ir(Math.max(Or, t));
		}
		let i = await Ur(t, typeof n == "string" ? n : Z(n)), a = e.socket.readyState === 1;
		if (e.send(i), r.kind !== "announce") return;
		if (!a) return Ir(Pr(e));
		let o = qe(i)[1].id;
		return zr(e, o), Ir(Or);
	}
});
_r.getSockets;
var $r = (/* @__PURE__ */ "basspistol.org,bucket.coracle.social,chorus.pjv.me,koru.bitcointxoko.org,nos.lol,nostr-01.uid.ovh,nostr-01.yakihonne.com,nostr-relay.corb.net,nostr.data.haus,nostr.islandarea.net,nostr.sathoarder.com,nostr.tegila.com.br,nostr.vulpem.com,purplerelay.com,relay-can.zombi.cloudrodion.com,relay-rpi.edufeed.org,relay.agorist.space,relay.artio.inf.unibe.ch,relay.mostr.pub,relay.mostro.network,relay.sigit.io,relay02.lnfi.network,schnorr.me,social.amanah.eblessing.co,staging.yabu.me,strfry.shock.network,top.testrelay.top,yabu.me/v2".split(",")).map((e) => "wss://" + e);
//#endregion
export { Qr as joinRoom, W as selfId };
