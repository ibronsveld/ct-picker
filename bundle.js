(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],6:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":4,"./encode":5}],7:[function(require,module,exports){
"use strict";
require('buffer');
var createClient = require('@commercetools/sdk-client').createClient;
var createAuthMiddlewareForClientCredentialsFlow = require('@commercetools/sdk-middleware-auth').createAuthMiddlewareForClientCredentialsFlow;
var requestBuilder = require('@commercetools/api-request-builder').createRequestBuilder({projectKey: 'ivos-personal-project'});
var createHttpMiddleware = require('@commercetools/sdk-middleware-http').createHttpMiddleware;

const modalUI = `
    <style>
      /* The Modal (background) */
      .modal {
        display: none; /* Hidden by default */
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0,0,0); /* Fallback color */
        background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
      }
      
      /* Modal Content/Box */
      .modal-content {
        background-color: #fefefe;
        margin: 15% auto; /* 15% from the top and centered */
        padding: 20px;
        border: 1px solid #888;
        width: 80%; /* Could be more or less, depending on screen size */
      }
      
      /* The Close Button */
      .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
      }
      
      .close:hover,
      .close:focus {
        color: black;
        text-decoration: none;
        cursor: pointer;
      }
    </style>
    
    <div id="ctPickerDialog" class="modal">
      <!-- Modal content -->
      <div class="modal-content">
        <span class="close">&times;</span>
        <div id="loginContainer">
            <form>
                <h2>Sign in</h2>
            </form>
        </div>
        <div id="pickerContainer">
            <h2>Pick</h2>
        </div>
        <!--<iframe src="picker.html" style="width:100%;height:750px"></iframe>-->
        <div>
            <button>PICK</button>
        </div>
      </div>      
    </div>    
`;

window.CTPicker = function (options, containerElementID) {

  this.options = options;

  // Step 1: Parse the options
  if (this.options) {
    // Set
    if (this.options.token) {
      // We have a token, otherwise we have to load the login
      this.authenticated = true;
    } else {
      this.authenticated = false;
    }

    // try{
    //   // var btn = document.getElementById("myBtn");
    //   // // When the user clicks on the button, open the modal
    //   // btn.onclick = function () {
    //   //   modal.style.display = "block";
    //   // }
    //
    // } catch (err) {
    //   console.error("Error selecting container element", err);
    // }
  }

  try {
    this.containerElement = document.getElementById(containerElementID);

  } catch (err) {
    console.error("Error selecting container element", err);
  }

  // Step 2:
}

CTPicker.prototype.open = function () {
  //alert('open');
  if (this.containerElement) {
    this.containerElement.innerHTML = modalUI;

    // Get the modal
    var modal = document.getElementById("ctPickerDialog");
    modal.style.display = "block";

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
      modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };

    var productQuery = requestBuilder.products.build();
    var productRequest = {
      uri: productQuery,
      method: 'GET'
    };

    const client = createClient({
      // The order of the middlewares is important !!!
      middlewares: [
        createAuthMiddlewareForClientCredentialsFlow({
          host: 'https://auth.commercetools.com',
          projectKey: 'ivos-personal-project',
          credentials: {
            clientId: 'GVijKg5WUzUjZwO8v2FJNv_i',
            clientSecret: 'MoVEzWL2uAEj9Y0Zoy1F9dTIBPkXDUlk'
          }
        }, fetch),
        createHttpMiddleware({host: 'https://api.commercetools.com'}, fetch)
      ]
    });

    client.execute(productRequest).then((response) => {
      //console.log('ds');
      console.log(response);
    });

    //var client = CommercetoolsSdkClient.createClient()
    // // Check the state
    // if (this.authenticated) {
    //   document.getElementById("loginContainer").style.display = "none";
    //   document.getElementById("pickerContainer").style.display = "block";
    // } else {
    //   document.getElementById("pickerContainer").style.display = "none";
    //   document.getElementById("loginContainer").style.display = "block";
    // }
  }
}





},{"@commercetools/api-request-builder":8,"@commercetools/sdk-client":9,"@commercetools/sdk-middleware-auth":10,"@commercetools/sdk-middleware-http":11,"buffer":2}],8:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.CommercetoolsApiRequestBuilder = {}));
}(this, function (exports) { 'use strict';

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  /**
   * NOTE:
   *  These are so called implicit features
   *  which work on endpoints automatically as they only
   *  differ in the http method and request body
   *  and do not need any further processing.
   *  We specify these on endpoints for documentation purposes
   *  only.
   */
  var create = 'create';
  var update = 'update'; // `delete` is a reserved word in JavaScript

  var del = 'delete';
  /**
   * NOTE:
   *  These are so called explicit features
   *  which only work on a subset of endpoints and perform
   *  additional manipulation on the request.
   */

  var query = 'query';
  var queryOne = 'queryOne';
  var queryExpand = 'queryExpand';
  var queryLocation = 'queryLocation';
  var search = 'search';
  var projection = 'projection';
  var suggest = 'suggest';

  var features = /*#__PURE__*/Object.freeze({
    create: create,
    update: update,
    del: del,
    query: query,
    queryOne: queryOne,
    queryExpand: queryExpand,
    queryLocation: queryLocation,
    search: search,
    projection: projection,
    suggest: suggest
  });

  var services = {
    login: {
      type: 'login',
      endpoint: '/login',
      features: [create]
    },
    cartDiscounts: {
      type: 'cart-discounts',
      endpoint: '/cart-discounts',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    carts: {
      type: 'carts',
      endpoint: '/carts',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    categories: {
      type: 'categories',
      endpoint: '/categories',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    channels: {
      type: 'channels',
      endpoint: '/channels',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    customerGroups: {
      type: 'customer-groups',
      endpoint: '/customer-groups',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    customers: {
      type: 'customers',
      endpoint: '/customers',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    customersPassword: {
      type: 'customers-password',
      endpoint: '/customers/password',
      features: [create]
    },
    customersPasswordToken: {
      type: 'customers-password-token',
      endpoint: '/customers/password-token',
      features: [create, queryOne]
    },
    customersPasswordReset: {
      type: 'customers-password-reset',
      endpoint: '/customers/password/reset',
      features: [create]
    },
    customersEmailVerificationToken: {
      type: 'customers-email-verification-token',
      endpoint: '/customers/customers/email-token',
      features: [create, queryOne]
    },
    customersEmailVerification: {
      type: 'customers-email-verification',
      endpoint: '/customers/customers/email/confirm',
      features: [create]
    },
    customObjects: {
      type: 'custom-objects',
      endpoint: '/custom-objects',
      features: [create, update, del, query, queryOne]
    },
    discountCodes: {
      type: 'discount-codes',
      endpoint: '/discount-codes',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    extensions: {
      type: 'extensions',
      endpoint: '/extensions',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    inventory: {
      type: 'inventory',
      endpoint: '/inventory',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    messages: {
      type: 'messages',
      endpoint: '/messages',
      features: [query, queryOne, queryExpand]
    },
    myCarts: {
      type: 'my-carts',
      endpoint: '/me/carts',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    myOrders: {
      type: 'my-orders',
      endpoint: '/me/orders',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    orders: {
      type: 'orders',
      endpoint: '/orders',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    orderImport: {
      type: 'orderImport',
      endpoint: '/orders/import',
      features: [create, query]
    },
    payments: {
      type: 'payments',
      endpoint: '/payments',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    productDiscounts: {
      type: 'product-discounts',
      endpoint: '/product-discounts',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    productProjections: {
      type: 'product-projections',
      endpoint: '/product-projections',
      features: [query, queryOne, queryExpand, projection]
    },
    productProjectionsSearch: {
      type: 'product-projections-search',
      endpoint: '/product-projections/search',
      features: [search, queryOne, queryExpand, projection]
    },
    productProjectionsSuggest: {
      type: 'product-projections-suggest',
      endpoint: '/product-projections/suggest',
      features: [search, suggest, queryOne, projection]
    },
    products: {
      type: 'products',
      endpoint: '/products',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    productTypes: {
      type: 'product-types',
      endpoint: '/product-types',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    project: {
      type: 'project',
      endpoint: '/',
      features: [update, query]
    },
    reviews: {
      type: 'reviews',
      endpoint: '/reviews',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    shippingMethods: {
      type: 'shipping-methods',
      endpoint: '/shipping-methods',
      features: [create, update, del, query, queryOne, queryExpand, queryLocation]
    },
    shoppingLists: {
      type: 'shopping-lists',
      endpoint: '/shopping-lists',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    states: {
      type: 'states',
      endpoint: '/states',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    subscriptions: {
      type: 'subscriptions',
      endpoint: '/subscriptions',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    taxCategories: {
      type: 'tax-categories',
      endpoint: '/tax-categories',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    types: {
      type: 'types',
      endpoint: '/types',
      features: [create, update, del, query, queryOne, queryExpand]
    },
    zones: {
      type: 'zones',
      endpoint: '/zones',
      features: [create, update, del, query, queryOne, queryExpand]
    }
  };

  /**
   * Return the default parameters for building a query string.
   *
   * @return {Object}
   */

  function getDefaultQueryParams() {
    return {
      id: null,
      expand: [],
      pagination: {
        page: null,
        perPage: null,
        sort: [],
        withTotal: null
      },
      location: {
        currency: '',
        country: '',
        state: ''
      },
      query: {
        operator: 'and',
        where: []
      },
      searchKeywords: []
    };
  }
  /**
   * Return the default parameters for building a query search string.
   *
   * @return {Object}
   */

  function getDefaultSearchParams() {
    return {
      expand: [],
      searchKeywords: [],
      pagination: {
        page: null,
        perPage: null,
        sort: [],
        withTotal: null
      },
      search: {
        facet: [],
        filter: [],
        filterByQuery: [],
        filterByFacets: [],
        fuzzy: false,
        fuzzyLevel: 0,
        markMatchingVariants: false,
        text: null
      }
    };
  }
  /**
   * Set the default parameters given the current service object.
   *
   * @return {void}
   */

  function setDefaultParams() {
    this.params.expand = getDefaultQueryParams().expand;
    if (this.features.includes(queryOne)) this.params.id = getDefaultQueryParams().id;

    if (this.features.includes(query)) {
      this.params.pagination = getDefaultQueryParams().pagination;
      this.params.query = getDefaultQueryParams().query;
    }

    if (this.features.includes(search)) {
      this.params.pagination = getDefaultSearchParams().pagination;
      this.params.search = getDefaultSearchParams().search;
    }

    if (this.features.includes(queryLocation)) this.params.location = getDefaultQueryParams().location;
    if (this.features.includes(suggest)) this.params.searchKeywords = [];
  }

  var hasKey = function hasKey(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };
  /**
   * Set the supplied parameters given the current service object.
   *
   * @return {void}
   */


  function setParams(params) {
    var _this = this;

    // verify params
    var knownKeys = ['expand', 'id', 'key', 'customerId', 'cartId', 'sort', 'page', 'perPage', 'staged', 'priceCurrency', 'priceCountry', 'priceCustomerGroup', 'priceChannel', 'text', 'fuzzy', 'fuzzyLevel', 'markMatchingVariants', 'facet', 'filter', 'filterByQuery', 'filterByFacets', 'searchKeywords', 'where', 'whereOperator', 'version', 'country', 'currency', 'state', 'dataErasure', 'withTotal'];
    Object.keys(params).forEach(function (key) {
      if (!knownKeys.includes(key)) throw new Error("Unknown key \"".concat(key, "\""));
    }); // query-expand

    if (params.expand) params.expand.forEach(function (expansion) {
      _this.expand(expansion);
    }); // query-id

    if (hasKey(params, 'id')) this.byId(params.id);
    if (hasKey(params, 'key')) this.byKey(params.key);
    if (hasKey(params, 'customerId')) this.byCustomerId(params.customerId);
    if (hasKey(params, 'cartId')) this.byCartId(params.cartId); // query-location

    if (hasKey(params, 'country')) this.byCountry(params.country);
    if (hasKey(params, 'currency')) this.byCurrency(params.currency);
    if (hasKey(params, 'state')) this.byState(params.state); // query-page

    if (params.sort) params.sort.forEach(function (sortDesc) {
      _this.sort(sortDesc.by, sortDesc.direction === 'asc');
    });
    if (hasKey(params, 'page')) this.page(params.page);
    if (hasKey(params, 'perPage')) this.perPage(params.perPage); // query-projection

    if (hasKey(params, 'staged')) this.staged(params.staged);
    if (hasKey(params, 'priceCurrency')) this.priceCurrency(params.priceCurrency);
    if (hasKey(params, 'priceCountry')) this.priceCountry(params.priceCountry);
    if (hasKey(params, 'priceCustomerGroup')) this.priceCustomerGroup(params.priceCustomerGroup);
    if (hasKey(params, 'priceChannel')) this.priceChannel(params.priceChannel); // query-search

    if (params.text) this.text(params.text.value, params.text.language);
    if (params.fuzzy) this.fuzzy(); // boolean switch

    if (hasKey(params, 'fuzzyLevel')) this.fuzzyLevel(params.fuzzyLevel);
    if (params.markMatchingVariants) this.markMatchingVariants(); // boolean switch

    if (params.facet) params.facet.forEach(function (facet) {
      _this.facet(facet);
    });
    if (params.filter) params.filter.forEach(function (filter) {
      _this.filter(filter);
    });
    if (params.filterByQuery) params.filterByQuery.forEach(function (query$$1) {
      _this.filterByQuery(query$$1);
    });
    if (params.filterByFacets) params.filterByFacets.forEach(function (facet) {
      _this.filterByFacets(facet);
    }); // query-suggest

    if (params.searchKeywords) params.searchKeywords.forEach(function (searchKeyword) {
      _this.searchKeywords(searchKeyword.value, searchKeyword.language);
    }); // query

    if (params.where) params.where.forEach(function (predicate) {
      _this.where(predicate);
    });
    if (hasKey(params, 'whereOperator')) this.whereOperator(params.whereOperator); // version

    if (hasKey(params, 'version')) this.withVersion(params.version); // dataErasure

    if (hasKey(params, 'dataErasure')) this.withFullDataErasure(); // withTotal

    if (hasKey(params, 'withTotal')) this.withTotal(params.withTotal);
  }

  /**
   * Given an object, return a clone with non-function properties defined as
   * non-enumerable, unwritable, and unconfigurable.
   *
   * @param {Object}
   * @return {Object}
   */
  function classify(object) {
    var forceEnumerable = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var clone = {};
    Object.keys(object).forEach(function (key) {
      Object.defineProperty(clone, key, {
        value: object[key],
        enumerable: forceEnumerable ? true : typeof object[key] === 'function'
      });
    });
    return clone;
  }

  /**
   * Build the query string with the given parameters.
   *
   * @param  {Object} params - An object with query / search parameters.
   * @throws If argument is missing.
   * @return {string} The fully encoded query string.
   */
  function buildQueryString(params) {
    if (!params) throw new Error('Missing options object to build query string.');
    var query = params.query,
        pagination = params.pagination,
        search = params.search,
        expand = params.expand,
        staged = params.staged,
        priceCurrency = params.priceCurrency,
        priceCountry = params.priceCountry,
        priceCustomerGroup = params.priceCustomerGroup,
        priceChannel = params.priceChannel,
        searchKeywords = params.searchKeywords,
        version = params.version,
        customerId = params.customerId,
        cartId = params.cartId,
        location = params.location,
        dataErasure = params.dataErasure;
    var queryString = [];
    if (customerId) queryString.push("customerId=".concat(customerId));
    if (cartId) queryString.push("cartId=".concat(cartId));
    if (typeof staged === 'boolean') queryString.push("staged=".concat(staged.toString()));
    if (priceCurrency) queryString.push("priceCurrency=".concat(priceCurrency));
    if (priceCountry) queryString.push("priceCountry=".concat(priceCountry));
    if (priceCustomerGroup) queryString.push("priceCustomerGroup=".concat(priceCustomerGroup));
    if (priceChannel) queryString.push("priceChannel=".concat(priceChannel));
    if (expand && expand.length) queryString = queryString.concat(expand.map(function (e) {
      return "expand=".concat(e);
    }));

    if (query) {
      var operator = query.operator,
          where = query.where;
      var whereParams = where.join(encodeURIComponent(" ".concat(operator, " ")));
      if (whereParams) queryString.push("where=".concat(whereParams));
    }

    if (location) {
      var country = location.country,
          currency = location.currency,
          state = location.state;
      if (country) queryString.push("country=".concat(country));
      if (currency) queryString.push("currency=".concat(currency));
      if (state) queryString.push("state=".concat(state));
    }

    if (pagination) {
      var page = pagination.page,
          perPage = pagination.perPage,
          sort = pagination.sort,
          withTotal = pagination.withTotal;
      if (typeof perPage === 'number') queryString.push("limit=".concat(perPage));

      if (page) {
        var limitParam = perPage || 20;
        var offsetParam = limitParam * (page - 1);
        queryString.push("offset=".concat(offsetParam));
      }

      if (sort && sort.length) queryString = queryString.concat(sort.map(function (s) {
        return "sort=".concat(s);
      }));
      if (typeof withTotal === 'boolean') queryString.push("withTotal=".concat(String(withTotal)));
    }

    if (search) {
      var text = search.text,
          fuzzy = search.fuzzy,
          fuzzyLevel = search.fuzzyLevel,
          markMatchingVariants = search.markMatchingVariants,
          facet = search.facet,
          filter = search.filter,
          filterByQuery = search.filterByQuery,
          filterByFacets = search.filterByFacets;
      if (text) queryString.push("text.".concat(text.lang, "=").concat(text.value));
      if (fuzzy) queryString.push('fuzzy=true');
      if (fuzzyLevel) queryString.push("fuzzyLevel=".concat(fuzzyLevel));
      queryString.push("markMatchingVariants=".concat(markMatchingVariants.toString()));
      facet.forEach(function (f) {
        return queryString.push("facet=".concat(f));
      });
      filter.forEach(function (f) {
        return queryString.push("filter=".concat(f));
      });
      filterByQuery.forEach(function (f) {
        return queryString.push("filter.query=".concat(f));
      });
      filterByFacets.forEach(function (f) {
        return queryString.push("filter.facets=".concat(f));
      });
    }

    if (searchKeywords) searchKeywords.forEach(function (f) {
      return queryString.push("searchKeywords.".concat(f.lang, "=").concat(f.value));
    });
    if (version) queryString.push("version=".concat(version));
    if (dataErasure) queryString.push(dataErasure);
    return queryString.join('&');
  }

  /**
   * Set the `version` number to the internal state of the service instance
   * in order to generate a uri with the resource version (for example; to
   * perform a `DELETE` request)
   *
   * @param  {number} version - The version of the resource
   * @throws if `version` is missing or not a number.
   * @return {Object} The instance of the service, can be chained.
   */
  function withVersion(version) {
    if (typeof version !== 'number') throw new Error('A resource version is missing or invalid');
    this.params.version = version;
    return this;
  }

  /**
   * Set the `dataErasure` option to the internal state of the service instance
   * in order to generate a DELETE uri that guarantees that all personal data related to
   * the particular object, including invisible data, is erased, in compliance with the GDPR.
   *
   * Users are, however, responsible for identifying and deleting all objects that belong to a customer, and deleting them.
   *
   * More info here: https://docs.commercetools.com/release-notes#releases-2018-05-24-data-erasure
   *
   * @return {Object} The instance of the service, can be chained.
   */
  function withFullDataErasure() {
    this.params.dataErasure = 'dataErasure=true';
    return this;
  }

  /**
   * Set the given `predicate` to the internal state of the service instance.
   *
   * @param  {string} predicate - A non-URI encoded string representing a
   * [Predicate]{@link http://dev.sphere.io/http-api.html#predicates}
   * @throws If `predicate` is missing.
   * @return {Object} The instance of the service, can be chained.
   */
  function where(predicate) {
    if (!predicate) throw new Error('Required argument for `where` is missing');
    var encodedPredicate = encodeURIComponent(predicate);
    this.params.query.where.push(encodedPredicate);
    return this;
  }
  /**
   * Set the logical operator to combine multiple query predicates
   * {@link module:commons/query.where}
   *
   * @param  {string} operator - A logical operator `and`, `or`
   * @throws If `operator` is missing or has a wrong value.
   * @return {Object} The instance of the service, can be chained.
   */

  function whereOperator(operator) {
    if (!operator) throw new Error('Required argument for `whereOperator` is missing');
    if (!(operator === 'and' || operator === 'or')) throw new Error('Required argument for `whereOperator` is invalid, ' + 'allowed values are (`and`, `or`)');
    this.params.query.operator = operator;
    return this;
  }

  var query$1 = /*#__PURE__*/Object.freeze({
    where: where,
    whereOperator: whereOperator
  });

  /**
   * Set the given `id` to the internal state of the service instance.
   *
   * @param  {string} id - A resource `UUID`
   * @throws If `id` is missing.
   * @return {Object} The instance of the service, can be chained.
   */
  function byId(id) {
    if (!id) throw new Error('Required argument for `byId` is missing');
    if (this.params.key) throw new Error('A key for this resource has already been set. ' + 'You cannot use both `byKey` and `byId`.');
    if (this.params.customerId) throw new Error('A customerId for this resource has already been set. ' + 'You cannot use both `byId` and `byCustomerId`.');
    if (this.params.cartId) throw new Error('A cartId for this resource has already been set. ' + 'You cannot use both `byId` and `byCartId`.');
    this.params.id = id;
    return this;
  }
  /**
   * Set the given `key` to the internal state of the service instance.
   *
   * @param  {string} key - A resource `key`
   * @throws If `key` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function byKey(key) {
    if (!key) throw new Error('Required argument for `byKey` is missing');
    if (this.params.id) throw new Error('An ID for this resource has already been set. ' + 'You cannot use both `byId` and `byKey`.');
    this.params.key = key;
    return this;
  }
  /**
   * Set the given `id` to the `customerId`internal state of the service instance.
   * For querying customer carts
   *
   * @param  {string} id - A resource `UUID`
   * @throws If `id` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function byCustomerId(custId) {
    if (!custId) throw new Error('Required argument for `byCustomerId` is missing');
    if (this.params.id) throw new Error('An ID for this resource has already been set. ' + 'You cannot use both `byId` and `byCustomerId`.');
    this.params.customerId = custId;
    return this;
  }
  /**
   * Set the given `id` to the `cartId` internal state of the service instance.
   * For querying shipping methods by cart id
   *
   * @param  {string} id - A resource `UUID`
   * @throws If `id` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function byCartId(cartId) {
    if (!cartId) throw new Error('Required argument for `byCartId` is missing');
    if (this.params.id) throw new Error('An ID for this resource has already been set. ' + 'You cannot use both `byId` and `byCartId`.');
    this.params.cartId = cartId;
    return this;
  }

  var queryId = /*#__PURE__*/Object.freeze({
    byId: byId,
    byKey: byKey,
    byCustomerId: byCustomerId,
    byCartId: byCartId
  });

  /**
   * Set the given `country` param used for selection by country
   *
   * @param  {string} value - A two-digit country code as per ISO 3166-1 alpha-2
   * @return {Object} The instance of the service, can be chained.
   */
  function byCountry(value) {
    if (!value) throw new Error('Required argument for `byCountry` is missing');
    this.params.location.country = value;
    return this;
  }
  /**
   * Set the given `currency` param used for selection by currency.
   *
   * @param  {string} value - The currency code compliant to ISO 4217
   * Can only be used with country parameter
   * @return {Object} The instance of the service, can be chained.
   */

  function byCurrency(value) {
    if (!value) throw new Error('Required argument for `byCurrency` is missing'); // logic to verify country has been set

    if (!this.params.location.country) throw new Error('A `country` for this resource has not been set. ' + 'You must set the country in order to use the `byCurrency` method.');
    this.params.location.currency = value;
    return this;
  }
  /**
   * Set the given `state` param used for selection by state.
   *
   * @param  {string} value - A string representing State name
   * Can only be used with country parameter
   * @return {Object} The instance of the service, can be chained.
   */

  function byState(value) {
    if (!value) throw new Error('Required argument for `byState` is missing'); // logic to verify country has been set

    if (!this.params.location.country) throw new Error('A `country` for this resource has not been set. ' + 'You must set the country in order to use the `byState` method.');
    this.params.location.state = value;
    return this;
  }

  var queryLocation$1 = /*#__PURE__*/Object.freeze({
    byCountry: byCountry,
    byCurrency: byCurrency,
    byState: byState
  });

  /**
   * Set the
   * [ExpansionPath](http://dev.sphere.io/http-api.html#reference-expansion)
   * used for expanding a
   * [Reference](http://dev.sphere.io/http-api-types.html#reference)
   * of a resource.
   *
   * @param  {string} value - The expand path expression.
   * @throws If `value` is missing.
   * @return {Object} The instance of the service, can be chained.
   */
  // eslint-disable-next-line import/prefer-default-export
  function expand(value) {
    if (!value) throw new Error('Required argument for `expand` is missing');
    var encodedPath = encodeURIComponent(value); // Note: this goes to base `params`, not `params.query`
    // to be compatible with search.

    this.params.expand.push(encodedPath);
    return this;
  }

  var queryExpand$1 = /*#__PURE__*/Object.freeze({
    expand: expand
  });

  /**
   * Set the sort expression for the query, if the related endpoint supports it.
   * It is possible to specify several `sort` parameters.
   * In this case they are combined into a composed `sort` where the results
   * are first sorted by the first expression, followed by equal values being
   * sorted according to the second expression, and so on.
   *
   * @param  {string} sortPath - The sort path expression.
   * @param  {boolean} [ascending] - Whether the direction should be
   * ascending or not (default: `true`).
   * @throws If `sortPath` is missing.
   * @return {Object} The instance of the service, can be chained.
   */
  function sort(sortPath) {
    var ascending = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (!sortPath) throw new Error('Required argument for `sort` is missing');
    var direction = ascending ? 'asc' : 'desc';
    var encodedSort = encodeURIComponent("".concat(sortPath, " ").concat(direction));
    this.params.pagination.sort.push(encodedSort);
    return this;
  }
  /**
   * Set the page number to be requested from the complete query result
   * (used for pagination as `offset`)
   *
   * @param  {string} value - The page number, greater then zero.
   * @throws If `value` is missing or is a number lesser then one.
   * @return {Object} The instance of the service, can be chained.
   */

  function page(value) {
    if (typeof value !== 'number' && !value) throw new Error('Required argument for `page` is missing or invalid');
    if (typeof value !== 'number' || value < 1) throw new Error('Required argument for `page` must be a number >= 1');
    this.params.pagination.page = value;
    return this;
  }
  /**
   * Set the number of results to be returned from a query result
   * (used for pagination as `limit`)
   *
   * @param  {string} value - How many results in a page,
   * greater or equals then zero.
   * @throws If `value` is missing or is a number lesser then zero.
   * @return {Object} The instance of the service, can be chained.
   */

  function perPage(value) {
    if (typeof value !== 'number' && !value) throw new Error('Required argument for `perPage` is missing or invalid');
    if (typeof value !== 'number' || value < 0) throw new Error('Required argument for `perPage` must be a number >= 0');
    this.params.pagination.perPage = value;
    return this;
  }
  /**
   * Set whether or not the total should be calculated (and included) in the result
   * of a paginated query result.
   *
   * @param {boolean} value - indicating if the total should be included or not
   */

  function withTotal() {
    var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    if (typeof value !== 'boolean') throw new Error('Required argument for `withTotal` is missing or invalid');
    this.params.pagination.withTotal = value;
    return this;
  }

  var queryPage = /*#__PURE__*/Object.freeze({
    sort: sort,
    page: page,
    perPage: perPage,
    withTotal: withTotal
  });

  /**
   * Define whether to get the staged or current projection
   *
   * @param  {boolean} staged - Either `true` (default) or `false`
   * (for current / published)
   * @return {Object} The instance of the service, can be chained.
   */
  function staged() {
    var shouldFetchStaged = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    this.params.staged = shouldFetchStaged;
    return this;
  }
  /**
   * Define whether to set price Selection or not
   * Set the given `priceCurrency` param used for price selection.
   *
   * @param  {string} value - The currency code compliant to ISO 4217
   * @return {Object} The instance of the service, can be chained.
   */

  function priceCurrency(value) {
    this.params.priceCurrency = value;
    return this;
  }
  /**
   * Define whether to set price Selection or not
   * Set the given `priceCountry` param used for price selection.
   *
   * @param  {string} value - A two-digit country code as per ISO 3166-1 alpha-2
   * Can only be used with priceCurrency parameter
   * @return {Object} The instance of the service, can be chained.
   */

  function priceCountry(value) {
    this.params.priceCountry = value;
    return this;
  }
  /**
   * Define whether to set price Selection or not
   * Set the given `priceCustomerGroup` param used for price selection.
   *
   * @param  {string} value - price customer group UUID
   * Can only be used with priceCurrency parameter
   * @return {Object} The instance of the service, can be chained.
   */

  function priceCustomerGroup(value) {
    this.params.priceCustomerGroup = value;
    return this;
  }
  /**
   * Define whether to set price Selection or not
   * Set the given `priceChannel` param used for price selection.
   *
   * @param  {string} value - price channel UUID
   * Can only be used with priceCurrency parameter
   * @return {Object} The instance of the service, can be chained.
   */

  function priceChannel(value) {
    this.params.priceChannel = value;
    return this;
  }

  var queryProjection = /*#__PURE__*/Object.freeze({
    staged: staged,
    priceCurrency: priceCurrency,
    priceCountry: priceCountry,
    priceCustomerGroup: priceCustomerGroup,
    priceChannel: priceChannel
  });

  /**
   * Define a Suggestion used for matching tokens for product projections,
   * via a suggest tokenizer.
   *
   * The suggestions can be used to implement a basic auto-complete functionality.
   * The source of data for suggestions is the searchKeyword field in a product.
   *
   * @param  {string} value - A non-URI encoded string representing a
   * text to search for.
   * @param  {string} lang - An ISO language tag, used for search
   * the given text in localized content.
   * @throws If `value` or `lang` is missing.
   * @return {Object} The instance of the service, can be chained.
   */
  // eslint-disable-next-line import/prefer-default-export
  function searchKeywords(value, lang) {
    if (!value || !lang) throw new Error('Required arguments for `searchKeywords` are missing');
    this.params.searchKeywords.push({
      lang: lang,
      value: encodeURIComponent(value)
    });
    return this;
  }

  var querySuggest = /*#__PURE__*/Object.freeze({
    searchKeywords: searchKeywords
  });

  /**
   * Set the given `text` param used for full-text search.
   *
   * @param  {string} value - A non-URI encoded string representing a
   * text to search for.
   * @param  {string} lang - An ISO language tag, used for search
   * the given text in localized content.
   * @throws If `value` or `lang` is missing.
   * @return {Object} The instance of the service, can be chained.
   */
  function text(value, lang) {
    if (!value || !lang) throw new Error('Required arguments for `text` are missing');
    this.params.search.text = {
      lang: lang,
      value: encodeURIComponent(value)
    };
    return this;
  }
  /**
   * Define whether to enable the fuzzy search.
   *
   * @return {Object} The instance of the service, can be chained.
   */

  function fuzzy() {
    this.params.search.fuzzy = true;
    return this;
  }
  /**
   * Define the level of the fuzzy search
   *
   * @param  {number} value - An integer representing the fuzzy level
   * @throws If `value` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function fuzzyLevel(value) {
    if (!value) throw new Error('Required argument for `fuzzyLevel` is missing');
    this.params.search.fuzzyLevel = value;
    return this;
  }
  /**
   * Define whether to enable markMatchingVariants
   *
   * @return {Object} The instance of the service, can be chained.
   */

  function markMatchingVariants() {
    this.params.search.markMatchingVariants = true;
    return this;
  }
  /**
   * Set the given `facet` filter used for calculating statistical counts.
   *
   * @param  {string} value - A non-URI encoded string representing a
   * facet expression.
   * @throws If `value` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function facet(value) {
    if (!value) throw new Error('Required argument for `facet` is missing');
    var encodedFacet = encodeURIComponent(value);
    this.params.search.facet.push(encodedFacet);
    return this;
  }
  /**
   * Set the given `filter` param used for filtering search results.
   *
   * @param  {string} value - A non-URI encoded string representing a
   * filter expression.
   * @throws If `value` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function filter(value) {
    if (!value) throw new Error('Required argument for `filter` is missing');
    var encodedFilter = encodeURIComponent(value);
    this.params.search.filter.push(encodedFilter);
    return this;
  }
  /**
   * Set the given `filter.query` param used for filtering search results.
   *
   * @param  {string} value - A non-URI encoded string representing a
   * filter by query expression.
   * @throws If `value` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function filterByQuery(value) {
    if (!value) throw new Error('Required argument for `filterByQuery` is missing');
    var encodedFilter = encodeURIComponent(value);
    this.params.search.filterByQuery.push(encodedFilter);
    return this;
  }
  /**
   * Set the given `filter.facets` param used for filtering search results.
   *
   * @param  {string} value - A non-URI encoded string representing a
   * filter by query expression.
   * @throws If `value` is missing.
   * @return {Object} The instance of the service, can be chained.
   */

  function filterByFacets(value) {
    if (!value) throw new Error('Required argument for `filterByFacets` is missing');
    var encodedFilter = encodeURIComponent(value);
    this.params.search.filterByFacets.push(encodedFilter);
    return this;
  }

  var querySearch = /*#__PURE__*/Object.freeze({
    text: text,
    fuzzy: fuzzy,
    fuzzyLevel: fuzzyLevel,
    markMatchingVariants: markMatchingVariants,
    facet: facet,
    filter: filter,
    filterByQuery: filterByQuery,
    filterByFacets: filterByFacets
  });

  var requiredDefinitionProps = ['type', 'endpoint', 'features'];

  function getIdOrKey(params) {
    if (params.id) return "/".concat(params.id);
    if (params.key) return "/key=".concat(params.key);
    return '';
  }

  function createService(definition) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    if (!definition) throw new Error('Cannot create a service without its definition.');
    requiredDefinitionProps.forEach(function (key) {
      if (!definition[key]) throw new Error("Definition is missing required parameter ".concat(key, "."));
    });
    if (!Array.isArray(definition.features) || !definition.features.length) throw new Error('Definition requires `features` to be a non empty array.');
    if (!options) throw new Error('No project defined. Please enter a project key');
    var type = definition.type,
        endpoint = definition.endpoint,
        features = definition.features;
    return classify(_objectSpread({
      type: type,
      features: features,
      params: getDefaultQueryParams(),
      withVersion: withVersion,
      withFullDataErasure: withFullDataErasure
    }, features.reduce(function (acc, feature) {
      if (feature === query) return _objectSpread({}, acc, query$1, queryPage);
      if (feature === queryOne) return _objectSpread({}, acc, queryId);
      if (feature === queryLocation) return _objectSpread({}, acc, queryLocation$1);
      if (feature === queryExpand) return _objectSpread({}, acc, queryExpand$1);
      if (feature === search) return _objectSpread({}, acc, querySearch, queryPage, {
        params: getDefaultSearchParams()
      });
      if (feature === suggest) return _objectSpread({}, acc, querySearch, queryPage, querySuggest);
      if (feature === projection) return _objectSpread({}, acc, queryProjection);
      return acc;
    }, {}), {
      // Call this method to get the built request URI
      // Pass some options to further configure the URI:
      // - `withProjectKey: false`: will omit the projectKey from the URI
      build: function build() {
        var uriOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
          withProjectKey: true
        };
        var withProjectKey = uriOptions.withProjectKey;
        var queryParams = buildQueryString(this.params);
        var uri = (withProjectKey ? "/".concat(options) : '') + endpoint + // TODO this can lead to invalid URIs as getIdOrKey can return
        //   "/?customerId", so there can be multiple question marks,
        // same for when `queryParams` and `version` are present
        getIdOrKey(this.params) + (queryParams ? "?".concat(queryParams) : '');
        setDefaultParams.call(this);
        return uri;
      },
      // Call this method to parse an object as params
      parse: function parse(params) {
        setParams.call(this, params);
        return this;
      }
    }));
  }

  // the `projectkey` (string) and `customServices` (object)
  // The projectKey property is required
  // A sample options object would be:
  //
  //     options: {
  //       projectKey: 'myProject',
  //       customServices: {
  //         foo: {
  //           type: 'foo',
  //           endpoint: '/foo',
  //           features: [
  //             features.query,
  //           ],
  //         }
  //       }
  //     }

  function createRequestBuilder() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var allServices = _objectSpread({}, services, options.customServices);

    return Object.keys(allServices).reduce( // a return type object is not allowed in flow due to a bug (https://github.com/facebook/flow/issues/5182)

    /* eslint-disable-next-line */
    function (acc, key) {
      return _objectSpread({}, acc, _defineProperty({}, key, createService(allServices[key], options.projectKey)));
    }, {});
  }

  // eslint-disable-next-line import/prefer-default-export

  exports.features = features;
  exports.createRequestBuilder = createRequestBuilder;

  Object.defineProperty(exports, '__esModule', { value: true });

}));


},{}],9:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('querystring')) :
  typeof define === 'function' && define.amd ? define(['exports', 'querystring'], factory) :
  (global = global || self, factory(global.CommercetoolsSdkClient = {}, global.qs));
}(this, function (exports, qs) { 'use strict';

  qs = qs && qs.hasOwnProperty('default') ? qs['default'] : qs;

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }

  var METHODS = ['ACL', 'BIND', 'CHECKOUT', 'CONNECT', 'COPY', 'DELETE', 'GET', 'HEAD', 'LINK', 'LOCK', 'M-SEARCH', 'MERGE', 'MKACTIVITY', 'MKCALENDAR', 'MKCOL', 'MOVE', 'NOTIFY', 'OPTIONS', 'PATCH', 'POST', 'PROPFIND', 'PROPPATCH', 'PURGE', 'PUT', 'REBIND', 'REPORT', 'SEARCH', 'SOURCE', 'SUBSCRIBE', 'TRACE', 'UNBIND', 'UNLINK', 'UNLOCK', 'UNSUBSCRIBE'];

  function validate(funcName, request) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
      allowedMethods: METHODS
    };
    if (!request) // eslint-disable-next-line max-len
      throw new Error("The \"".concat(funcName, "\" function requires a \"Request\" object as an argument. See https://commercetools.github.io/nodejs/sdk/Glossary.html#clientrequest"));
    if (typeof request.uri !== 'string') // eslint-disable-next-line max-len
      throw new Error("The \"".concat(funcName, "\" Request object requires a valid uri. See https://commercetools.github.io/nodejs/sdk/Glossary.html#clientrequest"));
    if (!options.allowedMethods.includes(request.method)) // eslint-disable-next-line max-len
      throw new Error("The \"".concat(funcName, "\" Request object requires a valid method. See https://commercetools.github.io/nodejs/sdk/Glossary.html#clientrequest"));
  }

  function compose() {
    for (var _len = arguments.length, funcs = new Array(_len), _key = 0; _key < _len; _key++) {
      funcs[_key] = arguments[_key];
    }

    // eslint-disable-next-line no-param-reassign
    funcs = funcs.filter(function (func) {
      return typeof func === 'function';
    });
    if (funcs.length === 1) return funcs[0];
    return funcs.reduce(function (a, b) {
      return function () {
        return a(b.apply(void 0, arguments));
      };
    });
  }

  function createClient(options) {
    if (!options) throw new Error('Missing required options');
    if (options.middlewares && !Array.isArray(options.middlewares)) throw new Error('Middlewares should be an array');
    if (!options.middlewares || !Array.isArray(options.middlewares) || !options.middlewares.length) throw new Error('You need to provide at least one middleware');
    return {
      /*
        Given a request object,
      */
      execute: function execute(request) {
        validate('exec', request);
        return new Promise(function (resolve, reject) {
          var resolver = function resolver(rq, rs) {
            // Note: pick the promise `resolve` and `reject` function from
            // the response object. This is not necessary the same function
            // given from the `new Promise` constructor, as middlewares could
            // override those functions for custom behaviours.
            if (rs.error) rs.reject(rs.error);else {
              var resObj = {
                body: rs.body || {},
                statusCode: rs.statusCode
              };
              if (rs.headers) resObj.headers = rs.headers;
              if (rs.request) resObj.request = rs.request;
              rs.resolve(resObj);
            }
          };

          var dispatch = compose.apply(void 0, _toConsumableArray(options.middlewares))(resolver);
          dispatch(request, // Initial response shape
          {
            resolve: resolve,
            reject: reject,
            body: undefined,
            error: undefined
          });
        });
      },
      process: function process(request, fn, processOpt) {
        var _this = this;

        validate('process', request, {
          allowedMethods: ['GET']
        });
        if (typeof fn !== 'function') // eslint-disable-next-line max-len
          throw new Error('The "process" function accepts a "Function" as a second argument that returns a Promise. See https://commercetools.github.io/nodejs/sdk/api/sdkClient.html#processrequest-processfn-options'); // Set default process options

        var opt = _objectSpread({
          total: Number.POSITIVE_INFINITY,
          accumulate: true
        }, processOpt);

        return new Promise(function (resolve, reject) {
          var _request$uri$split = request.uri.split('?'),
              _request$uri$split2 = _slicedToArray(_request$uri$split, 2),
              path = _request$uri$split2[0],
              queryString = _request$uri$split2[1];

          var requestQuery = _objectSpread({}, qs.parse(queryString));

          var query = _objectSpread({
            // defaults
            limit: 20
          }, requestQuery);

          var hasFirstPageBeenProcessed = false;
          var itemsToGet = opt.total;

          var processPage = function processPage(lastId) {
            var acc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
            // Use the lesser value between limit and itemsToGet in query
            var limit = query.limit < itemsToGet ? query.limit : itemsToGet;
            var originalQueryString = qs.stringify(_objectSpread({}, query, {
              limit: limit
            }));

            var enhancedQuery = _objectSpread({
              sort: 'id asc',
              withTotal: false
            }, lastId ? {
              where: "id > \"".concat(lastId, "\"")
            } : {});

            var enhancedQueryString = qs.stringify(enhancedQuery);

            var enhancedRequest = _objectSpread({}, request, {
              uri: "".concat(path, "?").concat(enhancedQueryString, "&").concat(originalQueryString)
            });

            _this.execute(enhancedRequest).then(function (payload) {
              var _payload$body = payload.body,
                  results = _payload$body.results,
                  resultsLength = _payload$body.count;

              if (!resultsLength && hasFirstPageBeenProcessed) {
                resolve(acc || []);
                return;
              }

              Promise.resolve(fn(payload)).then(function (result) {
                hasFirstPageBeenProcessed = true;
                var accumulated;
                if (opt.accumulate) accumulated = acc.concat(result || []);
                itemsToGet -= resultsLength; // If there are no more items to get, it means the total number
                // of items in the original request have been fetched so we
                // resolve the promise.
                // Also, if we get less results in a page then the limit set it
                // means that there are no more pages and that we can finally
                // resolve the promise.

                if (resultsLength < query.limit || !itemsToGet) {
                  resolve(accumulated || []);
                  return;
                }

                var last = results[resultsLength - 1];
                var newLastId = last && last.id;
                processPage(newLastId, accumulated);
              }).catch(reject);
            }).catch(reject);
          }; // Start iterating through pages


          processPage();
        });
      }
    };
  }

  // eslint-disable-next-line import/prefer-default-export

  exports.createClient = createClient;

  Object.defineProperty(exports, '__esModule', { value: true });

}));


},{"querystring":6}],10:[function(require,module,exports){
(function (Buffer){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.CommercetoolsSdkMiddlewareAuth = {}));
}(this, function (exports) { 'use strict';

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  var MANAGE_PROJECT = 'manage_project';
  var MANAGE_PRODUCTS = 'manage_products';
  var VIEW_PRODUCTS = 'view_products';
  var MANAGE_ORDERS = 'manage_orders';
  var VIEW_ORDERS = 'view_orders';
  var MANAGE_MY_ORDERS = 'manage_my_orders';
  var MANAGE_CUSTOMERS = 'manage_customers';
  var VIEW_CUSTOMERS = 'view_customers';
  var MANAGE_MY_PROFILE = 'manage_my_profile';
  var MANAGE_TYPES = 'manage_types';
  var VIEW_TYPES = 'view_types';
  var MANAGE_PAYMENTS = 'manage_payments';
  var VIEW_PAYMENTS = 'view_payments';
  var CREATE_ANONYMOUS_TOKEN = 'create_anonymous_token';
  var MANAGE_SUBSCRIPTIONS = 'manage_subscriptions';

  var scopes = /*#__PURE__*/Object.freeze({
    MANAGE_PROJECT: MANAGE_PROJECT,
    MANAGE_PRODUCTS: MANAGE_PRODUCTS,
    VIEW_PRODUCTS: VIEW_PRODUCTS,
    MANAGE_ORDERS: MANAGE_ORDERS,
    VIEW_ORDERS: VIEW_ORDERS,
    MANAGE_MY_ORDERS: MANAGE_MY_ORDERS,
    MANAGE_CUSTOMERS: MANAGE_CUSTOMERS,
    VIEW_CUSTOMERS: VIEW_CUSTOMERS,
    MANAGE_MY_PROFILE: MANAGE_MY_PROFILE,
    MANAGE_TYPES: MANAGE_TYPES,
    VIEW_TYPES: VIEW_TYPES,
    MANAGE_PAYMENTS: MANAGE_PAYMENTS,
    VIEW_PAYMENTS: VIEW_PAYMENTS,
    CREATE_ANONYMOUS_TOKEN: CREATE_ANONYMOUS_TOKEN,
    MANAGE_SUBSCRIPTIONS: MANAGE_SUBSCRIPTIONS
  });

  // POST https://{host}/oauth/token?grant_type=client_credentials&scope={scope}
  // Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==
  function buildRequestForClientCredentialsFlow(options) {
    if (!options) throw new Error('Missing required options');
    if (!options.host) throw new Error('Missing required option (host)');
    if (!options.projectKey) throw new Error('Missing required option (projectKey)');
    if (!options.credentials) throw new Error('Missing required option (credentials)');
    var _options$credentials = options.credentials,
        clientId = _options$credentials.clientId,
        clientSecret = _options$credentials.clientSecret;
    if (!(clientId && clientSecret)) throw new Error('Missing required credentials (clientId, clientSecret)');
    var defaultScope = "".concat(MANAGE_PROJECT, ":").concat(options.projectKey);
    var scope = (options.scopes || [defaultScope]).join(' ');
    var basicAuth = Buffer.from("".concat(clientId, ":").concat(clientSecret)).toString('base64'); // This is mostly useful for internal testing purposes to be able to check
    // other oauth endpoints.

    var oauthUri = options.oauthUri || '/oauth/token';
    var url = options.host.replace(/\/$/, '') + oauthUri;
    var body = "grant_type=client_credentials&scope=".concat(scope);
    return {
      basicAuth: basicAuth,
      url: url,
      body: body
    };
  }
  function buildRequestForPasswordFlow(options) {
    if (!options) throw new Error('Missing required options');
    if (!options.host) throw new Error('Missing required option (host)');
    if (!options.projectKey) throw new Error('Missing required option (projectKey)');
    if (!options.credentials) throw new Error('Missing required option (credentials)');
    var _options$credentials2 = options.credentials,
        clientId = _options$credentials2.clientId,
        clientSecret = _options$credentials2.clientSecret,
        user = _options$credentials2.user;
    var pKey = options.projectKey;
    if (!(clientId && clientSecret && user)) throw new Error('Missing required credentials (clientId, clientSecret, user)');
    var username = user.username,
        password = user.password;
    if (!(username && password)) throw new Error('Missing required user credentials (username, password)');
    var scope = (options.scopes || []).join(' ');
    var scopeStr = scope ? "&scope=".concat(scope) : '';
    var basicAuth = Buffer.from("".concat(clientId, ":").concat(clientSecret)).toString('base64'); // This is mostly useful for internal testing purposes to be able to check
    // other oauth endpoints.

    var oauthUri = options.oauthUri || "/oauth/".concat(pKey, "/customers/token");
    var url = options.host.replace(/\/$/, '') + oauthUri; // eslint-disable-next-line max-len
    // encode username and password as requested by platform

    var body = "grant_type=password&username=".concat(encodeURIComponent(username), "&password=").concat(encodeURIComponent(password)).concat(scopeStr);
    return {
      basicAuth: basicAuth,
      url: url,
      body: body
    };
  }
  function buildRequestForRefreshTokenFlow(options) {
    if (!options) throw new Error('Missing required options');
    if (!options.host) throw new Error('Missing required option (host)');
    if (!options.projectKey) throw new Error('Missing required option (projectKey)');
    if (!options.credentials) throw new Error('Missing required option (credentials)');
    if (!options.refreshToken) throw new Error('Missing required option (refreshToken)');
    var _options$credentials3 = options.credentials,
        clientId = _options$credentials3.clientId,
        clientSecret = _options$credentials3.clientSecret;
    if (!(clientId && clientSecret)) throw new Error('Missing required credentials (clientId, clientSecret)');
    var basicAuth = Buffer.from("".concat(clientId, ":").concat(clientSecret)).toString('base64'); // This is mostly useful for internal testing purposes to be able to check
    // other oauth endpoints.

    var oauthUri = options.oauthUri || '/oauth/token';
    var url = options.host.replace(/\/$/, '') + oauthUri;
    var body = "grant_type=refresh_token&refresh_token=".concat(options.refreshToken);
    return {
      basicAuth: basicAuth,
      url: url,
      body: body
    };
  }
  function buildRequestForAnonymousSessionFlow(options) {
    if (!options) throw new Error('Missing required options');
    if (!options.projectKey) throw new Error('Missing required option (projectKey)');
    var pKey = options.projectKey; // eslint-disable-next-line no-param-reassign

    options.oauthUri = options.oauthUri || "/oauth/".concat(pKey, "/anonymous/token");
    var result = buildRequestForClientCredentialsFlow(options);
    if (options.credentials.anonymousId) result.body += "&anonymous_id=".concat(options.credentials.anonymousId);
    return _objectSpread({}, result);
  }

  function mergeAuthHeader(token, req) {
    return _objectSpread({}, req, {
      headers: _objectSpread({}, req.headers, {
        Authorization: "Bearer ".concat(token)
      })
    });
  }

  function calculateExpirationTime(expiresIn) {
    return Date.now() + expiresIn * 1000 - // Add a gap of 2 hours before expiration time.
    2 * 60 * 60 * 1000;
  }

  function executeRequest(_ref) {
    var fetcher = _ref.fetcher,
        url = _ref.url,
        basicAuth = _ref.basicAuth,
        body = _ref.body,
        tokenCache = _ref.tokenCache,
        requestState = _ref.requestState,
        pendingTasks = _ref.pendingTasks,
        response = _ref.response;
    fetcher(url, {
      method: 'POST',
      headers: {
        Authorization: "Basic ".concat(basicAuth),
        'Content-Length': Buffer.byteLength(body).toString(),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body
    }).then(function (res) {
      if (res.ok) return res.json().then(function (_ref2) {
        var token = _ref2.access_token,
            expiresIn = _ref2.expires_in,
            refreshToken = _ref2.refresh_token;
        var expirationTime = calculateExpirationTime(expiresIn); // Cache new token

        tokenCache.set({
          token: token,
          expirationTime: expirationTime,
          refreshToken: refreshToken
        }); // Dispatch all pending requests

        requestState.set(false); // Freeze and copy pending queue, reset original one for accepting
        // new pending tasks

        var executionQueue = pendingTasks.slice(); // eslint-disable-next-line no-param-reassign

        pendingTasks = [];
        executionQueue.forEach(function (task) {
          // Assign the new token in the request header
          var requestWithAuth = mergeAuthHeader(token, task.request); // console.log('test', cache, pendingTasks)
          // Continue by calling the task's own next function

          task.next(requestWithAuth, task.response);
        });
      }); // Handle error response

      return res.text().then(function (text) {
        var parsed;

        try {
          parsed = JSON.parse(text);
        } catch (error) {
          /* noop */
        }

        var error = new Error(parsed ? parsed.message : text);
        if (parsed) error.body = parsed;
        response.reject(error);
      });
    }).catch(function (error) {
      if (response && typeof response.reject === 'function') response.reject(error);
    });
  }

  function authMiddlewareBase(_ref3, next, userOptions) {
    var request = _ref3.request,
        response = _ref3.response,
        url = _ref3.url,
        basicAuth = _ref3.basicAuth,
        body = _ref3.body,
        pendingTasks = _ref3.pendingTasks,
        requestState = _ref3.requestState,
        tokenCache = _ref3.tokenCache,
        fetcher = _ref3.fetch;
    if (!fetcher && typeof fetch === 'undefined') throw new Error('`fetch` is not available. Please pass in `fetch` as an option or have it globally available.');
    if (!fetcher) // eslint-disable-next-line
      fetcher = fetch; // Check if there is already a `Authorization` header in the request.
    // If so, then go directly to the next middleware.

    if (request.headers && request.headers.authorization || request.headers && request.headers.Authorization) {
      next(request, response);
      return;
    } // If there was a token in the tokenCache, and it's not expired, append
    // the token in the `Authorization` header.


    var tokenObj = tokenCache.get();

    if (tokenObj && tokenObj.token && Date.now() < tokenObj.expirationTime) {
      var requestWithAuth = mergeAuthHeader(tokenObj.token, request);
      next(requestWithAuth, response);
      return;
    } // Keep pending tasks until a token is fetched
    // Save next function as well, to call it once the token has been fetched, which prevents
    // unexpected behaviour in a context in which the next function uses global vars
    // or Promises to capture the token to hand it to other libraries, e.g. Apollo


    pendingTasks.push({
      request: request,
      response: response,
      next: next
    }); // If a token is currently being fetched, just wait ;)

    if (requestState.get()) return; // Mark that a token is being fetched

    requestState.set(true); // If there was a refreshToken in the tokenCache, and there was an expired
    // token or no token in the tokenCache, use the refreshToken flow

    if (tokenObj && tokenObj.refreshToken && (!tokenObj.token || tokenObj.token && Date.now() > tokenObj.expirationTime)) {
      executeRequest(_objectSpread({
        fetcher: fetcher
      }, buildRequestForRefreshTokenFlow(_objectSpread({}, userOptions, {
        refreshToken: tokenObj.refreshToken
      })), {
        tokenCache: tokenCache,
        requestState: requestState,
        pendingTasks: pendingTasks,
        response: response
      }));
      return;
    } // Token and refreshToken are not present or invalid. Request a new token...


    executeRequest({
      fetcher: fetcher,
      url: url,
      basicAuth: basicAuth,
      body: body,
      tokenCache: tokenCache,
      requestState: requestState,
      pendingTasks: pendingTasks,
      response: response
    });
  }

  function store(initVal) {
    var value = initVal;
    return {
      get: function get() {
        return value;
      },
      set: function set(val) {
        value = val;
        return value;
      }
    };
  }

  function createAuthMiddlewareForClientCredentialsFlow(options) {
    var tokenCache = store({});
    var pendingTasks = [];
    var requestState = store(false);
    return function (next) {
      return function (request, response) {
        // Check if there is already a `Authorization` header in the request.
        // If so, then go directly to the next middleware.
        if (request.headers && request.headers.authorization || request.headers && request.headers.Authorization) {
          next(request, response);
          return;
        }

        var params = _objectSpread({
          request: request,
          response: response
        }, buildRequestForClientCredentialsFlow(options), {
          pendingTasks: pendingTasks,
          requestState: requestState,
          tokenCache: tokenCache,
          fetch: options.fetch
        });

        authMiddlewareBase(params, next);
      };
    };
  }

  function createAuthMiddlewareForPasswordFlow(options) {
    var tokenCache = store({});
    var pendingTasks = [];
    var requestState = store(false);
    return function (next) {
      return function (request, response) {
        // Check if there is already a `Authorization` header in the request.
        // If so, then go directly to the next middleware.
        if (request.headers && request.headers.authorization || request.headers && request.headers.Authorization) {
          next(request, response);
          return;
        }

        var params = _objectSpread({
          request: request,
          response: response
        }, buildRequestForPasswordFlow(options), {
          pendingTasks: pendingTasks,
          requestState: requestState,
          tokenCache: tokenCache,
          fetch: options.fetch
        });

        authMiddlewareBase(params, next, options);
      };
    };
  }

  function createAuthMiddlewareForRefreshTokenFlow(options) {
    var tokenCache = store({});
    var pendingTasks = [];
    var requestState = store(false);
    return function (next) {
      return function (request, response) {
        // Check if there is already a `Authorization` header in the request.
        // If so, then go directly to the next middleware.
        if (request.headers && request.headers.authorization || request.headers && request.headers.Authorization) {
          next(request, response);
          return;
        }

        var params = _objectSpread({
          request: request,
          response: response
        }, buildRequestForRefreshTokenFlow(options), {
          pendingTasks: pendingTasks,
          requestState: requestState,
          tokenCache: tokenCache,
          fetch: options.fetch
        });

        authMiddlewareBase(params, next);
      };
    };
  }

  function createAuthMiddlewareForAnonymousSessionFlow(options) {
    var tokenCache = store({});
    var pendingTasks = [];
    var requestState = store(false);
    return function (next) {
      return function (request, response) {
        // Check if there is already a `Authorization` header in the request.
        // If so, then go directly to the next middleware.
        if (request.headers && request.headers.authorization || request.headers && request.headers.Authorization) {
          next(request, response);
          return;
        }

        var params = _objectSpread({
          request: request,
          response: response
        }, buildRequestForAnonymousSessionFlow(options), {
          pendingTasks: pendingTasks,
          requestState: requestState,
          tokenCache: tokenCache,
          fetch: options.fetch
        });

        authMiddlewareBase(params, next, options);
      };
    };
  }

  function createAuthMiddlewareWithExistingToken() {
    var authorization = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return function (next) {
      return function (request, response) {
        if (typeof authorization !== 'string') throw new Error('authorization must be a string');
        var force = options.force === undefined ? true : options.force;
        /** The request will not be modified if:
         *  1. no argument is passed
         *  2. force is false and authorization header exists
         */

        if (!authorization || (request.headers && request.headers.authorization || request.headers && request.headers.Authorization) && force === false) {
          return next(request, response);
        }

        var requestWithAuth = _objectSpread({}, request, {
          headers: _objectSpread({}, request.headers, {
            Authorization: authorization
          })
        });

        return next(requestWithAuth, response);
      };
    };
  }

  /* eslint-disable max-len */

  exports.scopes = scopes;
  exports.createAuthMiddlewareForClientCredentialsFlow = createAuthMiddlewareForClientCredentialsFlow;
  exports.createAuthMiddlewareForPasswordFlow = createAuthMiddlewareForPasswordFlow;
  exports.createAuthMiddlewareForRefreshTokenFlow = createAuthMiddlewareForRefreshTokenFlow;
  exports.createAuthMiddlewareForAnonymousSessionFlow = createAuthMiddlewareForAnonymousSessionFlow;
  exports.createAuthMiddlewareWithExistingToken = createAuthMiddlewareWithExistingToken;

  Object.defineProperty(exports, '__esModule', { value: true });

}));


}).call(this,require("buffer").Buffer)
},{"buffer":2}],11:[function(require,module,exports){
(function (Buffer){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.CommercetoolsSdkMiddlewareHttp = {}));
}(this, function (exports) { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _objectWithoutProperties(source, excluded) {
    if (source == null) return {};

    var target = _objectWithoutPropertiesLoose(source, excluded);

    var key, i;

    if (Object.getOwnPropertySymbols) {
      var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

      for (i = 0; i < sourceSymbolKeys.length; i++) {
        key = sourceSymbolKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
        target[key] = source[key];
      }
    }

    return target;
  }

  function defineError(statusCode, message) {
    var meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    // eslint-disable-next-line no-multi-assign
    this.status = this.statusCode = this.code = statusCode;
    this.message = message;
    Object.assign(this, meta);
    this.name = this.constructor.name; // eslint-disable-next-line no-proto

    this.constructor.prototype.__proto__ = Error.prototype;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
  /* eslint-disable max-len, flowtype/require-parameter-type */


  function NetworkError() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    defineError.call.apply(defineError, [this, 0
    /* special code to indicate network errors */
    ].concat(args));
  }
  function HttpError() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    defineError.call.apply(defineError, [this].concat(args));
  }
  function BadRequest() {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    defineError.call.apply(defineError, [this, 400].concat(args));
  }
  function Unauthorized() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    defineError.call.apply(defineError, [this, 401].concat(args));
  }
  function Forbidden() {
    for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    defineError.call.apply(defineError, [this, 403].concat(args));
  }
  function NotFound() {
    for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    defineError.call.apply(defineError, [this, 404].concat(args));
  }
  function ConcurrentModification() {
    for (var _len7 = arguments.length, args = new Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    defineError.call.apply(defineError, [this, 409].concat(args));
  }
  function InternalServerError() {
    for (var _len8 = arguments.length, args = new Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }

    defineError.call.apply(defineError, [this, 500].concat(args));
  }
  function ServiceUnavailable() {
    for (var _len9 = arguments.length, args = new Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      args[_key9] = arguments[_key9];
    }

    defineError.call.apply(defineError, [this, 503].concat(args));
  }
  /* eslint-enable max-len */

  function getErrorByCode(code) {
    switch (code) {
      case 0:
        return NetworkError;

      case 400:
        return BadRequest;

      case 401:
        return Unauthorized;

      case 403:
        return Forbidden;

      case 404:
        return NotFound;

      case 409:
        return ConcurrentModification;

      case 500:
        return InternalServerError;

      case 503:
        return ServiceUnavailable;

      default:
        return undefined;
    }
  }

  var errors = /*#__PURE__*/Object.freeze({
    NetworkError: NetworkError,
    HttpError: HttpError,
    BadRequest: BadRequest,
    Unauthorized: Unauthorized,
    Forbidden: Forbidden,
    NotFound: NotFound,
    ConcurrentModification: ConcurrentModification,
    InternalServerError: InternalServerError,
    ServiceUnavailable: ServiceUnavailable,
    default: getErrorByCode
  });

  function parseHeaders(headers) {
    if (headers.raw) // node-fetch
      return headers.raw(); // Tmp fix for Firefox until it supports iterables

    if (!headers.forEach) return {}; // whatwg-fetch

    var map = {};
    headers.forEach(function (value, name) {
      map[name] = value;
    });
    return map;
  }

  function createError(_ref) {
    var statusCode = _ref.statusCode,
        message = _ref.message,
        rest = _objectWithoutProperties(_ref, ["statusCode", "message"]);

    var errorMessage = message || 'Unexpected non-JSON error response';
    if (statusCode === 404) errorMessage = "URI not found: ".concat(rest.originalRequest.uri);
    var ResponseError = getErrorByCode(statusCode);
    if (ResponseError) return new ResponseError(errorMessage, rest);
    return new HttpError(statusCode, errorMessage, rest);
  } // calculates the delay duration exponentially
  // More info about the algorithm use here https://goo.gl/Xk8h5f


  function calcDelayDuration(retryCount, retryDelay, maxRetries, backoff, maxDelay) {
    if (backoff) return retryCount !== 0 // do not increase if it's the first retry
    ? Math.min(Math.round((Math.random() + 1) * retryDelay * Math.pow(2, retryCount)), maxDelay) : retryDelay;
    return retryDelay;
  }

  function maskAuthData(request, maskSensitiveHeaderData) {
    if (maskSensitiveHeaderData) {
      if (request.headers.authorization) request.headers.authorization = ['Bearer ********'];
      if (request.headers.Authorization) request.headers.Authorization = ['Bearer ********'];
    }
  }

  function createHttpMiddleware(_ref2) {
    var host = _ref2.host,
        credentialsMode = _ref2.credentialsMode,
        includeResponseHeaders = _ref2.includeResponseHeaders,
        includeOriginalRequest = _ref2.includeOriginalRequest,
        _ref2$maskSensitiveHe = _ref2.maskSensitiveHeaderData,
        maskSensitiveHeaderData = _ref2$maskSensitiveHe === void 0 ? true : _ref2$maskSensitiveHe,
        enableRetry = _ref2.enableRetry,
        _ref2$retryConfig = _ref2.retryConfig;
    _ref2$retryConfig = _ref2$retryConfig === void 0 ? {} : _ref2$retryConfig;
    var _ref2$retryConfig$max = _ref2$retryConfig.maxRetries,
        maxRetries = _ref2$retryConfig$max === void 0 ? 10 : _ref2$retryConfig$max,
        _ref2$retryConfig$bac = _ref2$retryConfig.backoff,
        backoff = _ref2$retryConfig$bac === void 0 ? true : _ref2$retryConfig$bac,
        _ref2$retryConfig$ret = _ref2$retryConfig.retryDelay,
        retryDelay = _ref2$retryConfig$ret === void 0 ? 200 : _ref2$retryConfig$ret,
        _ref2$retryConfig$max2 = _ref2$retryConfig.maxDelay,
        maxDelay = _ref2$retryConfig$max2 === void 0 ? Infinity : _ref2$retryConfig$max2,
        fetcher = _ref2.fetch;
    if (!fetcher && typeof fetch === 'undefined') throw new Error('`fetch` is not available. Please pass in `fetch` as an option or have it globally available.');
    if (!fetcher) // `fetcher` is set here rather than the destructuring to ensure fetch is
      // declared before referencing it otherwise it would cause a `ReferenceError`.
      // For reference of this pattern: https://github.com/apollographql/apollo-link/blob/498b413a5b5199b0758ce898b3bb55451f57a2fa/packages/apollo-link-http/src/httpLink.ts#L49
      // eslint-disable-next-line
      fetcher = fetch;
    return function (next) {
      return function (request, response) {
        var url = host.replace(/\/$/, '') + request.uri;
        var body = typeof request.body === 'string' || Buffer.isBuffer(request.body) ? request.body : // NOTE: `stringify` of `null` gives the String('null')
        JSON.stringify(request.body || undefined);

        var requestHeader = _objectSpread({
          'Content-Type': ['application/json']
        }, request.headers, body ? {
          'Content-Length': Buffer.byteLength(body).toString()
        } : null);

        var fetchOptions = _objectSpread({
          method: request.method,
          headers: requestHeader
        }, credentialsMode ? {
          credentials: credentialsMode
        } : {}, body ? {
          body: body
        } : null);

        var retryCount = 0; // wrap in a fn so we can retry if error occur

        function executeFetch() {
          // $FlowFixMe
          fetcher(url, fetchOptions).then(function (res) {
            if (res.ok) {
              if (fetchOptions.method === 'HEAD') {
                next(request, _objectSpread({}, response, {
                  statusCode: res.status
                }));
                return;
              }

              res.json().then(function (result) {
                var parsedResponse = _objectSpread({}, response, {
                  body: result,
                  statusCode: res.status
                });

                if (includeResponseHeaders) parsedResponse.headers = parseHeaders(res.headers);

                if (includeOriginalRequest) {
                  parsedResponse.request = _objectSpread({}, fetchOptions);
                  maskAuthData(parsedResponse.request, maskSensitiveHeaderData);
                }

                next(request, parsedResponse);
              });
              return;
            }

            if (res.status === 503 && enableRetry) if (retryCount < maxRetries) {
              setTimeout(executeFetch, calcDelayDuration(retryCount, retryDelay, maxRetries, backoff, maxDelay));
              retryCount += 1;
              return;
            } // Server responded with an error. Try to parse it as JSON, then
            // return a proper error type with all necessary meta information.

            res.text().then(function (text) {
              // Try to parse the error response as JSON
              var parsed;

              try {
                parsed = JSON.parse(text);
              } catch (error) {
                parsed = text;
              }

              var error = createError(_objectSpread({
                statusCode: res.status,
                originalRequest: request,
                retryCount: retryCount,
                headers: parseHeaders(res.headers)
              }, _typeof(parsed) === 'object' ? {
                message: parsed.message,
                body: parsed
              } : {
                message: parsed,
                body: parsed
              }));
              maskAuthData(error.originalRequest, maskSensitiveHeaderData); // Let the final resolver to reject the promise

              var parsedResponse = _objectSpread({}, response, {
                error: error,
                statusCode: res.status
              });

              next(request, parsedResponse);
            });
          }, // We know that this is a "network" error thrown by the `fetch` library
          function (e) {
            if (enableRetry) if (retryCount < maxRetries) {
              setTimeout(executeFetch, calcDelayDuration(retryCount, retryDelay, maxRetries, backoff, maxDelay));
              retryCount += 1;
              return;
            }
            var error = new NetworkError(e.message, {
              originalRequest: request,
              retryCount: retryCount
            });
            maskAuthData(error.originalRequest, maskSensitiveHeaderData);
            next(request, _objectSpread({}, response, {
              error: error,
              statusCode: 0
            }));
          });
        }

        executeFetch();
      };
    };
  }

  // eslint-disable-next-line import/prefer-default-export

  exports.createHttpMiddleware = createHttpMiddleware;
  exports.errors = errors;
  exports.getErrorByCode = getErrorByCode;

  Object.defineProperty(exports, '__esModule', { value: true });

}));


}).call(this,require("buffer").Buffer)
},{"buffer":2}]},{},[7]);
