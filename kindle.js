let fs = require('fs')
let readline = require('readline')
let path = '/Volumes/Kindle/documents/My Clippings.txt'
let fRead = fs.createReadStream(path)
let objReadline = readline.createInterface({ input: fRead })

class Book {
  constructor (bookName) {
    this.bookName = bookName
    this.labelArr = []
    this.commentArr = []
  }
}

let bookMap = new Map()
let currentLine = 0
let currentBook = {}
let rangeObj = {}
objReadline.on('line', (line) => {
  if (currentLine === 0) {
    let bookName = line
    if (!bookMap.has(bookName)) {
      let book = new Book(bookName)
      bookMap.set(bookName, book)
      currentBook = book
    } else {
      currentBook = bookMap.get(bookName)
    }
  } else if (currentLine === 1) {
    // 判断是否是笔记还是标注
    let positionStr = line
    /// 是否是标注还是笔记
    let isComment = line.indexOf('的笔记') !== -1
    /// 获取两个位置
    positionStr = positionStr.match(/#[0-9,-]+/g)[0]
    positionStr = positionStr.replace('#', '')
    let range = positionStr.split('-')
    if (range.length === 1) {
      range[1] = range[0]
    }
    range[0] = parseInt(range[0])
    range[1] = parseInt(range[1])
    /// 从book中有的位置删除掉
    let currentArr = isComment ? currentBook.commentArr : currentBook.labelArr
    let filterArr = currentArr.filter((curRange) => {
      if (curRange.range[1] < range[0] || curRange.range[0] > range[1]) {
        return true
      } else {
        return false
      }
    })
    rangeObj.range = range
    filterArr.push(rangeObj)
    if (isComment) {
      currentBook.commentArr = filterArr
    } else {
      currentBook.labelArr = filterArr
    }
  } else if (currentLine === 3) {
    rangeObj.detail = line
  }
  /// 当前计数
  if (currentLine === 4) {
    currentLine = 0
    currentBook = {}
    rangeObj = {}
  } else {
    currentLine += 1
  }
})

objReadline.on('close', () => {
  if (!fs.existsSync('./读书笔记')) {
    fs.mkdirSync('./读书笔记')
  }
  bookMap.forEach(item => {
    if (item.bookName.indexOf('您的剪贴') !== -1) return
    item.bookName = item.bookName.slice(1)
    console.log(item.bookName)
    /// 初始化write stream
    let ws = fs.createWriteStream(`./读书笔记/${item.bookName}.txt`)
    ws.write(`# ${item.bookName}\r\n\r\n`)
    ws.write(`#读书笔记\r\n\r\n`)
    /// 笔记列表
    let commentArr = item.commentArr.sort((comment1, comment2) => (comment1.range[0] - comment2.range[0]))
    /// 标注列表
    item.labelArr.sort((label1, label2) => {
      return label1.range[0] - label2.range[0]
    }).filter(label => label.detail !== '').forEach(label => {
      // console.log(`${label.range[0]} - ${label.range[1]} -> ${label.detail}`)
      if (commentArr.length > 0 && label.range[0] <= commentArr[0].range[0] && label.range[1] >= commentArr[0].range[1]) {
        let comment = commentArr.shift()
        if (comment.detail === '') return
        /// 写入标注和笔记
        ws.write(`> ○ ${label.detail}\r\n\r\n`)
        ws.write(`👆 **${comment.detail}**\r\n\r\n`)
      } else {
        /// 只写入标注
        ws.write(`> ○ ${label.detail}\r\n\r\n`)
      }
    })
    ws.end()
  })
})
