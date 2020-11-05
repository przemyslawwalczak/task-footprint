const fs = require('fs')
const TYPE = require('./data-type')
const hexy = require('hexy')

class Writable {
  constructor(path, options = {}) {
    this.fd
    
    this.offset = 0
    this.buffer = Buffer.alloc(0)

    this.counter = []

    return new Promise((resolve, reject) => {
      fs.open(path, 'w', (e, fd) => {
        if (e) return reject(e)

        this.fd = fd

        this.block(null)
        .then((result) => resolve(result))
        .catch(reject)
      })
    })
  }

  write(length, offset) {  
    if (typeof this.fd !== 'number') {
      return reject(new Error('Footprint.Stream not ready'))
    }

    return new Promise((resolve, reject) => {
      fs.write(this.fd, this.buffer, 0, length, offset, (e) => {
        if (e) return reject(e)
        resolve()
      })
    })
  }

  async append(type, value) {
    let offset = this.offset

    switch (type) {
      case TYPE.U8:
      case TYPE.S8:
        this.offset += 1
        break

      case TYPE.U16:
      case TYPE.S16:
        this.offset += 2
        break

      case TYPE.U32:
      case TYPE.S32:
        this.offset += 4
        break

      case TYPE.JSON:
        this.offset += 4
        this.offset += value.length
        break

      default: throw new Error(`unsupported type: ${type}`)
    }

    let length = this.offset - offset

    if (this.buffer.length < length) {
      this.buffer = Buffer.concat([this.buffer, Buffer.alloc(length)])
    }

    switch (type) {
      case TYPE.U8: {
        this.buffer.writeUInt8(value, 0)
      } break

      case TYPE.S8: {
        this.buffer.writeInt8(value, 0)
      } break

      case TYPE.U16: {
        this.buffer.writeUInt16LE(value, 0)
      } break

      case TYPE.S16: {
        this.buffer.writeInt16LE(value, 0)
      } break

      case TYPE.U32: {
        this.buffer.writeUInt32LE(value, 0)
      } break

      case TYPE.S32: {
        this.buffer.writeInt32LE(value, 0)
      } break

      case TYPE.JSON: {
        this.buffer.writeInt32LE(value.length, 0)
        this.buffer.write(value, 4, 'utf8')
      } break
    }

    return await this.write(length, offset)
  }

  async close() {
    fs.closeSync(this.fd)
  }

  async block(data) {
    // Data type BLOCK | DELTA
    await this.append(TYPE.S8, 0)

    let counter = {
      offset: this.offset,
      length: 0
    }

    // Counter
    await this.append(TYPE.S32, 0)

    // Block manifest
    await this.append(TYPE.JSON, JSON.stringify(data || null))

    return {
      delta: async (data) => {
        this.buffer.writeInt32LE(++counter.length, 0)
        await this.write(4, counter.offset)

        return await this.delta(data)
      },

      close: this.close.bind(this),
      block: this.block.bind(this)
    }
  }

  async delta(data) {
    // Data type BLOCK | DELTA
    await this.append(TYPE.S8, 1)

    // Data
    await this.append(TYPE.JSON, JSON.stringify(data || null))

    return this
  }
}

module.exports = Writable