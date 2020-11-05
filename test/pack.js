const Footprint = require('../index')

new Footprint.WritableStream('./data.bin')
.then(async data => {
  for (let i=0; i<1000; i++) {
    await data.delta({
      hello: 'world',
      counter: Math.random()
    })

    let bank = await data.block({
      name: 'character bank'
    })

    for (let j=0; j<10; j++) {
      await bank.delta({ index: j })
    }

    let storage = await data.block({
      name: 'character storage'
    })

    for (let k=0; k<10; k++) {
      await storage.delta({
        character: { uuid: '123-123-123-123' },
        index: k,
        some: 'other',
        variable: 'are',
        needed: 'for',
        testing: 'purposes',
        thedevil: 666,
        even: 'bigggeeerr',
        json: 'string'
      })
    }
  }

  await data.close()
})
