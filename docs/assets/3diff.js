/* eslint-disable no-unused-vars */
// List of diff types
const diffType = {
  tbd: 'TBD',
  mechanical: {
    id: 'EDIT',
    ins: 'INS',
    del: 'DEL'
  },
  structural: {
    id: 'STRUCTURAL',
    punctuation: 'PUNCTUATION',
    textInsert: 'TEXTINSERT',
    textDelete: 'TEXTDELETE',
    wordchange: 'WORDCHANGE',
    wordreplace: 'WORDREPLACE',
    textReplace: 'TEXTREPLACE',
    insert: 'INSERT',
    delete: 'DELETE',
    move: 'MOVE',
    noop: 'NOOP',
    wrap: 'WRAP',
    unwrap: 'UNWRAP',
    split: 'SPLIT',
    join: 'JOIN',
    replace: 'REPLACE'
  },
  semantic: {
    id: 'SEMANTIC',
    meaning: 'MEANING',
    editchain: 'EDITCHAIN'
  },
  newTextId: 'new',
  oldTextId: 'old'
}

//
const regexp = {
  // A single punctuation with a optional following \s (space)
  // and an optional following A-z (capitalized or not character)
  punctuation: '^[\\!\\"\\#\\$\\%\\&\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\=\\?\\@\\[\\]\\^\\_\\`\\{\\|\\}\\~ ]+[A-z]?$',

  accented: 'àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ',

  // No whitespaces
  wordchange: '^\\S*$',

  // xml tags
  tagSelector: '<[.A-z]?[^(><.)]+>',

  // unclosed
  unclosedTagSelector: '<[.A-z]?[^(><.)]+',
  unopenedTagSelector: '[.A-z]?[^(><.)]+>',

  // Text selector
  textSelector: '[A-z\\s]*',

  lowercaseLetter: '[a-z]+',

  tagElements: '[<>/?]',

  splitJoin: '^[\\s]*<[.A-z]?[^(><.)]+>[\\s]*<[.A-z]?[^(><.)]+>[\\s]*$',

  openingElement: '<[A-z]+[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\{\\}\\!\\;]*>'
}

const globalUser = 'USER-0001'

/**
 *
 *
 * @class DiffAlgorithmSelector
 */
class DiffAlgorithmSelector {
  /**
   * Creates an instance of DiffAlgorithmSelector.
   * @param {String} type
   * @memberof DiffAlgorithmSelector
   *
   * Returns the right type of algorithm
   */
  constructor (oldText, newText, type) {
    let result

    switch (type) {
      case DiffAlgorithmSelector.algorithms.diffMatchPatch:
        result = new DiffMatchPatchAdapter(oldText, newText)
        break
      default:
        result = null
    }
    return result
  }
}

DiffAlgorithmSelector.algorithms = {
  diffMatchPatch: 'diff_match_patch'
}

/**
 *
 *
 * @class Adapter
 */
class Adapter {
  constructor (oldText, newText) {
    this.oldText = oldText
    this.newText = newText
  }
  /**
   *
   *
   * @param {*} listMechanicalOperations
   * @memberof Adapter
   */
  makeDiff (listMechanicalOperations, html) {
    this.threeDiff = new ThreeDiff(listMechanicalOperations, this.oldText, this.newText, html)
  }

  /**
   *
   *
   * @returns
   * @memberof Adapter
   */
  getMechanicalOperations () {
    return this.threeDiff.getMechanicalOperations()
  }

  /**
   *
   *
   * @returns
   * @memberof Adapter
   */
  getStructuralOperations () {
    return this.threeDiff.getStructuralOperations()
  }

  /**
   *
   *
   * @returns
   * @memberof Adapter
   */
  getSemanticOperations () {
    return this.threeDiff.getSemanticOperations()
  }

  /**
   *
   *
   * @returns
   * @memberof Adapter
   */
  getDiffHTML () {
    return this.threeDiff.getDiffHTML()
  }
}

/**
 *
 *
 * @class DiffMatchPatchAdapter
 * @extends {Adapter}
 *
 * https://github.com/google/diff-match-patch/wiki/API
 *
 * This class contains the logic for handling the output of this algorithm
 * and creates the input structure of mechanical modifications for the 3Diff class
 */
class DiffMatchPatchAdapter extends Adapter {
  constructor (oldText, newText) {
    // Save texts
    super(oldText, newText)

    /* eslint-disable new-cap */
    let dmp = new diff_match_patch()
    /* eslint-enable new-cap */

    this.diffs = dmp.diff_main(oldText, newText)

    // Cleanup semantic
    // https://github.com/google/diff-match-patch/wiki/API#diff_cleanupsemanticdiffs--null
    dmp.diff_cleanupSemantic(this.diffs)

    console.log(this.diffs)

    // Get Patches
    // https://github.com/google/diff-match-patch/wiki/API#patch_makediffs--patches
    this.patches = dmp.patch_make(this.diffs)

    // Get the HTML
    this.html = dmp.diff_prettyHtml(this.diffs)

    // Execute the run algorithm
    this.runDiffAlgorithm()
  }

  /**
   *
   *
   * @returns
   * @memberof DiffMatchPatchAdapter
   */
  runDiffAlgorithm () {
    this.makeDiff(this._getMechanicalOps(), this.html)
  }

  /**
   *
   *
   * @memberof DiffMatchPatchAdapter
   */
  _getMechanicalOps () {
    // Create a temporary list of diffs
    let newDiffs = []

    // Iterate over patches
    for (let patch of this.patches) {
      // Set the absolute index
      let absoluteIndex = patch['start1']
      let diffs = patch['diffs']

      // Iterate over diffs
      diffs.map((diff, index) => {
        // Increase the current index by the length of current element, if it wasn't a DEL
        if (index > 0) {
          let previous = diffs[index - 1]
          if (previous[0] !== -1) {
            absoluteIndex += parseInt(previous[1].length)
          }
        }
        // Not_changed status doesn't matter
        if (diff[0] !== 0) {
          // Get mechanical type
          let op = diff['0'] === 1 ? diffType.mechanical.ins : diffType.mechanical.del

          // Update diffs
          newDiffs.push(new MechanicalDiff(op, diff['1'], absoluteIndex, newDiffs.length))
        }
      })
    }
    return newDiffs
  }
}

/**
 *
 *
 * @class Diff
 */
class Diff {
  /**
   *Creates an instance of Diff.
   * @param {*} type
   * @param {*} lastId
   * @memberof Diff
   */
  constructor (type, lastId) {
    this.id = this._setId(type, lastId)
  }

  /**
   *
   *
   * @param {*} type
   * @param {*} lastId
   * @returns id
   * @memberof Diff
   */
  _setId (type, lastId) {
    // Update the lastId
    lastId++

    // Start to create the new id
    let id = `${type}-`

    // Add the right amount of 0 before the new id
    let tmp = lastId.toString()
    let max = 4 - tmp.length
    while (max > 0) {
      id += '0'
      max--
    }
    return id + lastId
  }
}

/**
 *
 *
 * @class MechanicalDiff
 * @extends {Diff}
 */
class MechanicalDiff extends Diff {
  /**
   *Creates an instance of MechanicalDiff.
   * @param {*} operation
   * @param {*} content
   * @param {*} position
   * @param {*} lastId
   * @memberof MechanicalDiff
   */
  constructor (operation, content, position, lastId) {
    super(diffType.mechanical.id, lastId)
    this.op = operation
    this.content = content
    this.pos = position
  }

  /**
   *
   *
   * @param {*} text
   * @returns context
   * @memberof Diff
   *
   *     = - = = = +
   * eg: w o r l d s
   *     0 1 2 3 4 5
   */
  getWord (newText, minLen) {
    // Get the correct context
    // Normally, the position is calculated over the NEWTEXT. The regexp must be executed over it.
    // The algorithm needs to create a pattern with the text at the position, in the
    let newContent = newText.substring(this.pos, this.pos + minLen)

    if (newContent.trim().length === 0) return null

    // Set left and right selector
    const left = '[A-z]*'
    const right = '[A-z]*'

    // Get list of matching patterns
    let matches = RegExp(`${left}${RegExp.escape(newContent)}${right}`, 'g').execGlobal(newText)

    // Check each matching tag
    for (const match of matches) {
      // Save upper vars
      const regexUpperIndex = match.index + match[0].length
      let diffUpperIndex = this.pos + this.content.length

      // If the DIFF is a DEL, then add its length to the regexUpperIndex
      if (this.op === diffType.mechanical.del) diffUpperIndex -= this.content.length

      // The regex result must contain the entire diff content MUST start before and end after
      if (match.index <= this.pos && regexUpperIndex >= diffUpperIndex) {
        // If it contains only chars or digits
        if (/^[A-z\d]*$/.test(match[0])) { return match } else { return null }
      }
    }

    return null
  }

  /**
   *
   *
   * @param {*} text
   * @returns
   * @memberof MechanicalDiff
   */
  getEnclosingTag (text) {
    // Get the correct context
    // Normally, the position is calculated over the NEWTEXT. The regexp must be executed over it.
    // The algorithm needs to create a pattern with the text at the position, in the
    let newContent = text.substring(this.pos, this.pos + this.content.length)

    // If the new content is a sequence of open and close tags
    if (/^[<>]+/.test(newContent)) {
      newContent = text.substring(this.pos - this.content.length, this.pos).split(/[<>]/).splice(-1).pop()
    }
    if (/[<>]+$/.test(newContent)) {
      newContent = text.substring(this.pos - this.content.length, this.pos).split(/[<>]/).splice(-1).pop()
    }

    // Set left and right selector
    const left = '<[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\#]*'
    const right = '[A-z\\/\\-\\d\\=\\"\\s\\:\\%\\.\\,\\(\\)\\#]*>'

    // Get list of matching patterns
    let matches = RegExp(`${left}${RegExp.escape(newContent)}${right}`, 'g').execGlobal(text)

    // Check each matching tag
    for (const match of matches) {
      // Save upper vars
      const regexUpperIndex = match.index + match[0].length
      let diffUpperIndex = this.pos + this.content.length

      // If the DIFF is a DEL, then add its length to the regexUpperIndex
      if (this.op === diffType.mechanical.del) diffUpperIndex -= this.content.length

      // The regex result must contain the entire diff content MUST start before and end after
      if (match.index < this.pos && regexUpperIndex > diffUpperIndex) {
        // Retrieve XPATH and character position proper of the tag
        let tag = this.getCssSelector(text, match)

        // TODO CHANGE
        if (tag === null) return null

        // Add a more specific selector
        tag.path = `#newTextTemplate${tag.path}`

        return {
          tag: document.querySelector(tag.path),
          index: tag.index
        }
      }
    }

    return null
  }

  /**
   *
   *
   * @param {*} text
   * @memberof MechanicalDiff
   */
  getTag (text) {
    // If is a tag
    if (RegExp('^[\\s]*<\\/?[\\w]+[\\W\\s\\w\\d]*>[\\s]*$').test(this.content)) {
      let matches = RegExp(RegExp.escape(this.content), 'g').execGlobal(text)
      // Check each matching tag
      for (const match of matches) {
        // Save upper vars
        const regexUpperIndex = match.index + match[0].length
        let diffUpperIndex = this.pos + this.content.length

        // If the DIFF is a DEL, then add its length to the regexUpperIndex
        if (this.op === diffType.mechanical.del) diffUpperIndex -= this.content.length

        // The regex result must contain the entire diff content MUST start before and end after
        if (match.index <= this.pos && regexUpperIndex >= diffUpperIndex) {
          // Retrieve XPATH and character position proper of the tag
          let tag = this.getCssSelector(text, match)

          // TODO CHANGE
          if (tag === null) return null
          // Add a more specific selector
          tag.path = (this.op === diffType.mechanical.ins) ? `#newTextTemplate${tag.path}` : `#oldTextTemplate${tag.path}`

          let tmpTag = document.querySelector(tag.path)

          return {
            tag: tmpTag,
            index: tag.index
          }
        }
      }
    }

    return null
  }

  /**
   *
   *
   * @param {*} text
   * @param {*} tagString
   * @returns
   * @memberof MechanicalDiff
   */
  getCssSelector (text, tagString) {
    /**
     *
     */
    const initialiseTag = tag => {
      tag.tag = tag[0].replace(/[<>]/g, ' ').trim().split(/\s/)[0]
      tag.opening = tag.tag.indexOf('/') !== 0
      tag.tag = tag.tag.replace('/', '')
      tag.pos = 1

      return tag
    }

    /**
     *
     */
    const setSiblings = function (i, sibling) {
      // Left to end
      for (let j = i; j < previousTags.length; j++) {
        if ((previousTags[j].opening || j === previousTags.length - 1) && sibling.tag === previousTags[j].tag) {
          previousTags[j].pos++
        }

        if (previousTags[j].deepness !== sibling.deepness) break
      }
    }

    // When the the tag is retrieved, it should create its XPATH
    // Logging all of its parents I.E. everytime it finds a opening tag
    // const leftText = text.split(tagString[0])[0]
    const leftText = text.substring(0, this.pos)

    // Match all of the opening and closing elements
    let previousTags = RegExp(`<\\/?[\\w]+[\\w\\/\\-\\d\\=\\"\\s\\:\\%\\#\\?\\;\\&\\.\\,\\(\\)\\{\\}\\!\\;\\+${regexp.accented}]*>`, 'g').execGlobal(leftText)

    // Add the current element
    previousTags.push(tagString)

    // Initialise all of the tags
    previousTags.map(tag => initialiseTag(tag))

    // Save the deepness
    let deepness = 0
    previousTags[previousTags.length - 1].deepness = deepness

    for (let i = previousTags.length - 2; i > 0; i--) {
      // Save the current tag
      let curr = previousTags[i]
      let next = previousTags[i + 1]

      // Update deepness
      curr.deepness = deepness

      if (!curr.opening) curr.deepness = ++deepness

      if (curr.tag === 'img' || curr.tag === 'wbr' || curr.tag === 'link' || curr.tag === 'input') {
        previousTags.splice(i, 1)
        setSiblings(i, curr)
      } else if ((curr.opening && !next.opening) && next.tag === curr.tag) {
        previousTags.splice(i, 2)
        setSiblings(i, curr)
        deepness--
        i--
      }
    }

    if (!tagString.opening) { previousTags.push(tagString) }

    // Build the resultpath
    let resultpath = ''
    for (const parent of previousTags) {
      // Add the tag name
      resultpath += `>${parent.tag}`

      // If the siblings are more than 1 write it on path
      if (parent.pos > 1) resultpath += `:nth-of-type(${parent.pos})`
    }

    // position and css selector
    return {
      index: previousTags.splice(-1).pop().index,
      path: resultpath
    }
  }

  /**
   *
   *
   * @param {*} oldText
   * @param {*} newText
   * @returns
   * @memberof MechanicalDiff
   */
  _getText (oldText, newText) {
    return this.op === diffType.mechanical.ins ? newText : oldText
  }

  /**
   *
   *
   * @param {*} text
   * @returns
   * @memberof MechanicalDiff
   */
  _getContexts (text) {
    return {
      left: text.substring(0, this.pos),
      right: text.substring(this.op === diffType.mechanical.ins ? this.pos + this.content.length : this.pos, text.length)
    }
  }
}

/**
 *
 *
 * @class StructuralDiff
 * @extends {Diff}
 */
class StructuralDiff extends Diff {
  /**
   *Creates an instance of StructuralDiff.
   * @param {*} lastId
   * @param {*} item
   * @param {*} [by=globalUser]
   * @memberof StructuralDiff
   */
  constructor (lastId, item, by = globalUser) {
    super(diffType.structural.id, lastId)
    this.op = diffType.tbd
    this.by = by
    this.timestamp = new Date()
    this.items = [item]
  }

  /**
   *
   *
   * @param {*} operation
   * @memberof StructuralDiff
   */
  setOperation (operation) {
    this.op = operation
  }

  /**
   *
   *
   * @param {*} item
   * @memberof StructuralDiff
   */
  addItem (item) {
    this.items.push(item)
  }

  /**
   *
   *
   * @returns
   * @memberof StructuralDiff
   */
  isTextual () {
    return this.op === diffType.structural.punctuation ||
      this.op === diffType.structural.wordchange ||
      this.op === diffType.structural.wordreplace ||
      this.op === diffType.structural.textInsert ||
      this.op === diffType.structural.textDelete ||
      this.op === diffType.structural.textReplace
  }
}

/**
 *
 *
 * @class SemanticDiff
 * @extends {Diff}
 */
class SemanticDiff extends Diff {
  constructor (lastId, item) {
    super(diffType.semantic.id, lastId)
    this.op = diffType.tbd
    this.items = [item]
  }

  /**
   *
   *
   * @param {*} operation
   * @memberof StructuralDiff
   */
  setOperation (operation) {
    this.op = operation
  }

  /**
   *
   *
   * @param {*} item
   * @memberof StructuralDiff
   */
  addItem (item) {
    this.items.push(item)
  }
}

/**
 *
 *
 * @class ThreeDiff
 */
class ThreeDiff {
  /**
   *Creates an instance of ThreeDiff.
   * @param {*} listMechanicalOperations
   * @param {*} oldText
   * @param {*} newText
   * @memberof ThreeDiff
   */
  constructor (listMechanicalOperations, oldText, newText, html) {
    // Save the list of all the mechanical operations
    this.listMechanicalOperations = listMechanicalOperations
    this.listStructuralOperations = []
    this.listSemanticOperations = []

    console.log(this.listMechanicalOperations)

    // Save the texts
    this.oldText = oldText
    this.newText = newText

    this.html = html

    this._addTemplates()

    // Initialise the structural rules
    this.structuralRules = [

      // OPERATIONS OVER STRUCTURE

      /**
       * NOOP
       *
       */
      (leftDiff, rightDiff = null) => {
        //
        if (rightDiff !== null) return false

        //
        if (!/^[\s]+$/.test(leftDiff.content)) return false

        return diffType.structural.noop
      },

      /**
       * NOOP
       *
       */
      (leftDiff, rightDiff = null) => {
        // Block single diff
        if (rightDiff === null) return false

        // Check if both diffs are enclosed in a tag
        let leftDiffTag = leftDiff.getEnclosingTag(this.newText)
        let rightDiffTag = rightDiff.getEnclosingTag(this.newText)

        // If both diffs are enclosed in a tag
        if (leftDiffTag === null || rightDiffTag === null) return false

        // If the tags have the same index
        if (leftDiffTag.index !== rightDiffTag.index) return false

        // If the two diffs have different index
        if (leftDiff.pos === rightDiff.pos) return false

        // If the two diffs have equal content
        if (leftDiff.content !== rightDiff.content) return false

        return diffType.structural.noop
      },

      /**
       * MOVE
       *
       * Two params
       * Is a MOVE if and only if the DEL and INS contents are equal and the pos different
       */
      (leftDiff, rightDiff = null) => {
        // Block single diff
        if (rightDiff === null) return false

        //
        // if (!/^[\s]+$/.test(leftDiff.content) || !/^[\s]+$/.test(rightDiff.content)) return false

        //
        if (rightDiff.content.trim() !== leftDiff.content.trim()) return false

        //
        if (rightDiff.pos === leftDiff.pos) return false

        //
        if (leftDiff.op === rightDiff.op) return false

        return diffType.structural.move
      },

      /**
       * WRAP / UNWRAP
       */
      (leftDiff, rightDiff = null) => {
        if (rightDiff === null) return false

        // Block \s texts
        if (leftDiff.content.trim().length === 0 && rightDiff.content.trim().length === 0) return false

        // If the right diff contains a /
        if (!/\//.test(rightDiff.content)) return false

        // Check if both diffs are enclosed in a tag
        let leftDiffTag = leftDiff.getTag(this.newText)
        let rightDiffTag = rightDiff.getTag(this.newText)

        // RightDiff is the closing, so the tag will not match
        if (leftDiffTag === null || rightDiffTag === null) return false
        if (leftDiffTag.tag === null || rightDiffTag.tag === null) return false

        // The right diff must be enclosed in the leftDiff's tag
        if (rightDiff.pos < leftDiffTag.index || rightDiff.pos > leftDiffTag.index + leftDiffTag.tag.outerHTML.length) return false

        // Tag names must be equal
        if (leftDiffTag.tag.tagName !== rightDiff.content.replace(/[\\/<>]/g, '').toUpperCase()) return false

        return leftDiff.op === diffType.mechanical.ins ? diffType.structural.wrap : diffType.structural.unwrap
      },

      /**
       * JOIN/SPLIT
       */
      (leftDiff, rightDiff = null) => {
        if (rightDiff !== null) return false
        // Must be in this way <tag></tag> or </tag><tag> with optional space
        if (!RegExp(regexp.splitJoin).test(leftDiff.content)) return false

        return leftDiff.op === diffType.mechanical.ins ? diffType.structural.split : diffType.structural.join
      },

      /**
       * REPLACE 2 diffs
       */
      (leftDiff, rightDiff = null) => {
        // Block single diff
        if (rightDiff === null) return false

        // Block \s texts
        if (leftDiff.content.trim().length === 0 && rightDiff.content.trim().length === 0) return false

        // Check if both diffs are enclosed in a tag
        let leftDiffTag = leftDiff.getEnclosingTag(this.newText)
        let rightDiffTag = rightDiff.getEnclosingTag(this.newText)

        // If both diffs are enclosed in a tag
        if (leftDiffTag === null || rightDiffTag === null) return false
        if (leftDiffTag.tag === null || rightDiffTag.tag === null) return false

        // If the tags have the same index
        if (leftDiffTag.tag !== rightDiffTag.tag) return false

        // If the two diffs have equal index
        // if (leftDiff.pos !== rightDiff.pos) return false

        return diffType.structural.replace
      },

      /**
       * REPLACE 1 diffs
       */
      (leftDiff, rightDiff = null) => {
        if (rightDiff !== null) return false

        // Block \s texts
        if (leftDiff.content.trim().length === 0) return false

        // Check if both diffs are enclosed in a tag
        let leftDiffTag = leftDiff.getEnclosingTag(this.newText)

        // If both diffs are enclosed in a tag
        if (leftDiffTag === null) return false

        return diffType.structural.replace
      },

      /**
       * INSERT || DELETE
       *
       * Similar to TEXTINSERT || TEXDELETE, but in this case we need a balanced tree
       */
      (leftDiff, rightDiff = null) => {
        if (rightDiff !== null) return false
        // If the entire diff is a tag
        if (leftDiff.getTag(this.newText) === null) return false

        return leftDiff.op === diffType.mechanical.ins ? diffType.structural.insert : diffType.structural.delete
      },

      // OPERATIONS OVER TEXT

      /**
       * PUNCTUATION
       *
       * NOTE: must be two diffs
       * They are changes over the only punctuations without affecting the real text.
       * They can have optionally a follwing space and a letter
       */
      (leftDiff, rightDiff = null) => {
        // Block uncoupled diffs
        if (rightDiff === null) {
          return false
        }

        // Block diffs with different position
        if (leftDiff.pos !== rightDiff.pos) {
          return false
        }

        // Block diffs with same operation
        if (leftDiff.op === rightDiff.op) {
          return false
        }

        // Both content must match the punctuation regexp
        if (!RegExp(regexp.punctuation).test(leftDiff.content) || !RegExp(regexp.punctuation).test(rightDiff.content)) {
          return false
        }

        // Both contents must match the regex
        return diffType.structural.punctuation
      },

      /**
       * WORDREPLACE
       *
       * TODO
       */
      (leftDiff, rightDiff = null) => false,

      /**
       * WORDCHANGE 2 DIFF
       *
       */
      (leftDiff, rightDiff = null) => {
        // Block uncoupled diff
        if (rightDiff === null) return false

        // If the contents are only text
        if (!/^[A-z\d]*$/.test(leftDiff.content) || !/^[A-z\d]*$/.test(rightDiff.content)) return false

        // Save the minLen
        let minLen = Math.min(leftDiff.content.length, rightDiff.content.length)

        // Gather the context of the leftDiff
        let leftDiffContext = leftDiff.getWord(this.newText, minLen)
        let rightDiffContext = rightDiff.getWord(this.newText, minLen)

        // Block no context
        if (leftDiffContext === null || leftDiffContext[0] === null) return false
        if (rightDiffContext === null || rightDiffContext[0] === null) return false
        if (leftDiffContext[0].trim().length === 0 || rightDiffContext[0].trim().length === 0) return false

        // If both context are without spaces
        if (!RegExp(regexp.wordchange).test(leftDiffContext) || !RegExp(regexp.wordchange).test(leftDiffContext)) return false

        // If the two diffs context is equal
        if (leftDiffContext[0] !== rightDiffContext[0]) return false

        return diffType.structural.wordchange
      },

      /**
       * WORDCHANGE 1 DIFF
       *
       */
      (leftDiff, rightDiff = null) => {
        // Block couple of diffs
        if (rightDiff !== null) return false

        // If the content is only text
        if (!/^[A-z\d]*$/.test(leftDiff.content)) return false

        // Gather the context of the leftDiff
        let leftDiffContext = leftDiff.getWord(this.oldText, this.newText)

        // Block no context
        if (leftDiffContext === null || leftDiffContext[0] === null) return false
        if (leftDiffContext[0].trim().length === 0) return false

        // If context is without spaces
        if (!RegExp(regexp.wordchange).test(leftDiffContext)) return false

        return diffType.structural.wordchange
      },

      /**
       * TEXTREPLACE
       *
       * NOTE: only two parameters
       * If the position of two diffs are the same, the content and the operation are different
       */
      (leftDiff, rightDiff = null) => {
        // Block uncoupled diffs
        if (rightDiff === null) return false

        // Block \s texts
        if (leftDiff.content.trim().length === 0 || rightDiff.content.trim().length === 0) return false

        // If the diffs have different content
        if (leftDiff.content === rightDiff.content) return false

        // If the diffs have different operation
        if (leftDiff.op === rightDiff.op) return false

        // If the diffs have different position
        if (leftDiff.pos !== rightDiff.pos) return false

        return diffType.structural.textReplace
      },

      /**
       * TEXTINSERT || TEXTDELETE
       *
       * NOTE: only one parameter
       * If the previous rules don't match, this will match
       */
      (leftDiff, rightDiff = null) => {
        // Block coupled diffs
        if (rightDiff !== null) return false

        return leftDiff.op === diffType.mechanical.ins
          ? diffType.structural.textInsert
          : diffType.structural.textDelete
      }

    ]

    // Execute the structural analysis
    this._executeStructuralAnalysis()

    this.semanticRules = [

      /**
       * EDITCHAIN
       *
       */
      (leftDiff, rightDiff = null) => {
        if (rightDiff === null) return false

        // If old and new are not empty
        if (leftDiff.old.trim().length === 0 || rightDiff.old.trim().length === 0) return false
        if (leftDiff.new.trim().length === 0 || rightDiff.new.trim().length === 0) return false

        if (leftDiff.old !== rightDiff.old) return false
        if (leftDiff.new !== rightDiff.new) return false

        return diffType.semantic.editchain
      },

      /**
       * MEANING
       *
       */
      (leftDiff, rightDiff = null) => {
        // Block double diffs
        if (rightDiff !== null) return false

        return diffType.semantic.meaning
      }

    ]

    this._executeSemanticAnalysis()
  }

  /**
   *
   *
   * @memberof ThreeDiff
   */
  _addTemplates () {
    const tagName = 'iframe'

    let oldTextTemplate = document.createElement(tagName)
    oldTextTemplate.id = 'oldTextTemplate'
    oldTextTemplate.innerHTML = this.oldText

    let newTextTemplate = document.createElement(tagName)
    newTextTemplate.id = 'newTextTemplate'
    newTextTemplate.innerHTML = this.newText

    document.body.appendChild(oldTextTemplate)
    document.body.appendChild(newTextTemplate)
  }

  /**
   *
   *
   * @memberof ThreeDiff
   */
  _executeStructuralAnalysis () {
    // Copy the mechanicalOperations list
    let newListMechanicalOperations = this.listMechanicalOperations.slice(0)

    // Iterate over the list of mechanical operations
    const leftIndex = 0
    while (newListMechanicalOperations.length > 0) {
      // Set a matched rule
      let matchedRules = false

      // Remove the current diff from the list and get reference to it
      let leftDiff = newListMechanicalOperations.splice(leftIndex, 1)[0]

      // Create a placeholder structuralDiff
      let structuralDiff = new StructuralDiff(this.listStructuralOperations.length, leftDiff)

      for (let rightIndex = leftIndex; rightIndex < newListMechanicalOperations.length; rightIndex++) {
        let rightDiff = newListMechanicalOperations[rightIndex]

        // Iterate over rules
        for (let rule of this.structuralRules) {
          // If the current rule matches
          let ruleResult = rule(leftDiff, rightDiff)
          if (this._checkRuleResulCorrectness(ruleResult)) {
            // Update operation type
            structuralDiff.setOperation(ruleResult)

            // Add the mechanical operation and add it
            structuralDiff.addItem(newListMechanicalOperations.splice(rightIndex, 1)[0])

            // There is a match
            matchedRules = true

            // Update index to continue inside the for boundaries
            rightIndex--

            // Don't call any other rule
            break
          }
        }

        // If a wordchange or replace doesn't include the new content, it will not match any further
        if (structuralDiff.op === diffType.structural.wordchange && !structuralDiff.items.includes(rightDiff)) break
        if (structuralDiff.op === diffType.structural.replace && !structuralDiff.items.includes(rightDiff)) break

        // If the diff is a wordchange, check with other diffs
        if (structuralDiff.op !== diffType.tbd &&
          structuralDiff.op !== diffType.structural.wordchange &&
          structuralDiff.op !== diffType.structural.replace) {
          break
        }
      }

      // Try all rules on only left diff
      if (!matchedRules) {
        for (let rule of this.structuralRules) {
          // Try the rules
          let ruleResult = rule(leftDiff)
          if (this._checkRuleResulCorrectness(ruleResult)) {
            // Update operation type
            structuralDiff.setOperation(ruleResult)

            break
          }
        }
      }

      // Append the structural operation
      this.listStructuralOperations.push(structuralDiff)
    }

    this._setOldsNews()
  }

  /**
   *
   *
   * @memberof ThreeDiff
   */
  _executeSemanticAnalysis () {
    let newListStructuralOperations = this.listStructuralOperations.slice(0)

    // Iterate over the list of mechanical operations
    const leftIndex = 0
    while (newListStructuralOperations.length > 0) {
      // Set a matched rule
      let matchedRules = false

      // Remove the current diff from the list and get reference to it
      let leftDiff = newListStructuralOperations.splice(leftIndex, 1)[0]

      // Create a placeholder structuralDiff
      let semanticDiff = new SemanticDiff(this.listSemanticOperations.length, leftDiff)

      for (let rightIndex = leftIndex; rightIndex < newListStructuralOperations.length; rightIndex++) {
        let rightDiff = newListStructuralOperations[rightIndex]

        // Iterate over rules
        for (let rule of this.semanticRules) {
          // If the current rule matches
          let ruleResult = rule(leftDiff, rightDiff)
          if (this._checkRuleResulCorrectness(ruleResult)) {
            // Update operation type
            semanticDiff.setOperation(ruleResult)

            // Add the mechanical operation and add it
            semanticDiff.addItem(newListStructuralOperations.splice(rightIndex, 1)[0])

            // There is a match
            matchedRules = true

            // Update index to continue inside the for boundaries
            rightIndex--

            // Don't call any other rule
            break
          }
        }
      }

      // Try all rules on only left diff
      if (!matchedRules) {
        for (let rule of this.semanticRules) {
          // Try the rules
          let ruleResult = rule(leftDiff)
          if (this._checkRuleResulCorrectness(ruleResult)) {
            // Update operation type
            semanticDiff.setOperation(ruleResult)

            break
          }
        }
      }

      // Append the structural operation
      this.listSemanticOperations.push(semanticDiff)
    }
  }

  /**
   *
   *
   * @memberof ThreeDiff
   */
  _setOldsNews () {
    for (let structuralOperation of this.listStructuralOperations) {
      if (structuralOperation.isTextual()) {
        const texts = this._getOldNewText(structuralOperation)
        structuralOperation.new = texts.newText
        structuralOperation.old = texts.oldText
      } else {
        structuralOperation.new = ''
        structuralOperation.old = ''
      }
    }
  }

  /**
   *
   *
   * @param {*} structuralOperation
   * @returns
   * @memberof ThreeDiff
   */
  _getOldNewText (structuralOperation) {
    // Create a reference to the items
    let items = structuralOperation.items

    // Get first and last diff
    let newTextBoundaries = this._getContextBoundariesNew(this.newText, items[0], items[items.length - 1])

    // Create the new text
    let newText = newTextBoundaries.leftContext
    items.map((diff, index) => {
      // Save reference to the next diff
      let nextDiff = items[index + 1]

      // If is an insert save it
      if (diff.op === diffType.mechanical.ins) {
        newText += diff.content

        if (typeof nextDiff !== 'undefined') {
          newText += this.newText.substring(diff.pos + diff.content.length, nextDiff.pos)
        }
        // Else don't save it
      } else {
        if (typeof nextDiff !== 'undefined') {
          newText += this.newText.substring(diff.pos, nextDiff.pos)
        }
      }
    })

    newText += newTextBoundaries.rightContext

    // OldText
    let oldTextBoundaries = this._getContextBoundariesOld(this.newText, items[0], items[items.length - 1])

    let oldText = oldTextBoundaries.leftContext
    items.map((diff, index) => {
      // Save reference to the next diff
      let nextDiff = items[index + 1]

      // If is an insert don't save
      if (diff.op === diffType.mechanical.ins) {
        if (typeof nextDiff !== 'undefined') {
          oldText += this.oldText.substring(diff.pos, nextDiff.pos - diff.content.length)
        }
        // Else don't save it
      } else {
        oldText += diff.content
        if (typeof nextDiff !== 'undefined') {
          oldText += this.oldText.substring(diff.pos + diff.content.length, nextDiff.pos + diff.content.length)
        }
      }
    })

    oldText += newTextBoundaries.rightContext

    // Save the text
    return {
      newText: sanitize(newText),
      oldText: sanitize(oldText)
    }
  }

  /**
   *
   *
   * @param {*} text
   * @param {*} minDiff
   * @param {*} maxDiff
   * @returns
   * @memberof ThreeDiff
   */
  _getContextBoundariesNew (text, minDiff, maxDiff) {
    // The fixed length that will be used for retrieve the smallest amount of context
    const fixedLength = 30

    const initPos = minDiff.pos
    const endPos = maxDiff.pos + (maxDiff.op === diffType.mechanical.ins ? maxDiff.content.length : 0)

    const minPos = initPos < fixedLength ? 0 : fixedLength
    const maxPos = endPos + fixedLength < text.length ? endPos + fixedLength : text.length

    let leftContext = text.substring(minPos, initPos).split(/\s/)
    let rightContext = text.substring(endPos, maxPos).split(/\s/)

    return {
      leftContext: sanitize(leftContext[leftContext.length - 1]),
      rightContext: sanitize(rightContext[0])
    }
  }

  /**
   *
   *
   * @param {*} text
   * @param {*} minDiff
   * @param {*} maxDiff
   * @returns
   * @memberof ThreeDiff
   */
  _getContextBoundariesOld (text, minDiff, maxDiff) {
    // The fixed length that will be used for retrieve the smallest amount of context
    const fixedLength = 10

    const initPos = minDiff.pos
    const endPos = maxDiff.pos + (maxDiff.op === diffType.mechanical.del ? maxDiff.content.length : 0)

    const minPos = initPos < fixedLength ? 0 : fixedLength
    const maxPos = endPos + fixedLength < text.length ? endPos + fixedLength : text.length

    let leftContext = text.substring(minPos, initPos).split(/\s/)
    let rightContext = text.substring(endPos, maxPos).split(/\s/)

    return {
      leftContext: leftContext[leftContext.length - 1],
      rightContext: rightContext[0]
    }
  }

  /**
   *
   *
   * @param {*} result
   * @returns
   * @memberof ThreeDiff
   */
  _checkRuleResulCorrectness (result) {
    // Check if the result is not false
    if (result === false) return false

    // Check if the result is not null
    if (result === null) return false

    // Check if the result is not undefined
    if (typeof result === 'undefined') return false

    // Otherwise return true
    return true
  }

  /**
   *
   *
   * @returns
   * @memberof ThreeDiff
   */
  getMechanicalOperations () {
    return this.listMechanicalOperations
  }

  /**
   *
   *
   * @returns
   * @memberof ThreeDiff
   */
  getStructuralOperations () {
    return this.listStructuralOperations
  }

  /**
   *
   *
   * @returns
   * @memberof ThreeDiff
   */
  getSemanticOperations () {
    return this.listSemanticOperations
  }

  /**
   *
   *
   * @returns
   * @memberof ThreeDiff
   */
  getDiffHTML () {
    return this.html
  }
}

/* eslint-disable no-extend-native */
/* eslint-disable no-undef */

/**
 *
 *
 */
RegExp.escape = function (string) {
  return string.replace(/[-\\/\\^$*+?.()|[\]{}#&;,]/g, '\\$&')
}

/**
 *
 *
 */
const sanitize = function (string) {
  return string.replace(RegExp(regexp.tagSelector, 'g'), '')
    .replace(RegExp(regexp.unclosedTagSelector, 'g'), '')
    .replace(RegExp(regexp.unopenedTagSelector, 'g'), '')
}

/**
 *
 *
 */
RegExp.prototype.execGlobal = function (text) {
  // Save matches
  let matches = []
  let match

  if (this.source.length > 200) return []

  // Return all matches
  let tagSelectorRegexp = RegExp(this.source, this.flags)
  while ((match = tagSelectorRegexp.exec(text)) !== null) {
    matches.push(match)
  }

  return matches
}
/* eslint-enable no-extend-native */
/* eslint-enable no-unused-vars */
/* eslint-enable no-undef */
