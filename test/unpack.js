const Footprint = require('../index')

new Footprint.ReadableStream('F:/data.bin')
.then(async data => {
  let start = process.hrtime.bigint()

  // console.log(data)

  for await (let character of data) {
    // console.log(character)

    let bank = await data.block()
    
    // console.log(bank)

    for await (let item of bank) {
      // console.log(item)
    }

    let storage = await data.block()

    for await (let item of storage) {
      // console.log(item)
    }
  }

  console.log('unpacking ended in:', parseInt(process.hrtime.bigint() - start) / 1000000 / 1000, 's')
})