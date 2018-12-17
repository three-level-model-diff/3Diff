/* eslint-disable no-unused-vars */
/* eslint-disable no-labels */
// sad
// List of diff types
const diffType = {
  mechanical: {
    id: 'edit',
    ins: 'INS',
    del: 'DEL'
  },
  structural: {
    id: 'structural',
    punctuation: 'PUNCTUATION',
    textInsert: 'TEXTINSERT',
    textDelete: 'TEXTDELETE'
  },
  semantic: {
    id: 'semantic'
  }
}

// List of algorithms
const algorithms = {
  diffMatchPatch: 'diff_match_patch'
}

const regexp = {
  // A single punctuation with a optional following \s (space)
  // and an optional following A-z (capitalized or not character)
  punctuation: /\W[\s]?[A-z]?/
}

const globalUser = 'Gianmarco Spinaci'

/*
// List of structural rules
const structuralRules = {
  // Punctuation rules
  punctuation: [

    // If the diff position are same
    (leftDiff, rightDiff) => rightDiff === null ? true : (leftDiff.pos === rightDiff.pos),

    // If the content length is at most 3
    (leftDiff, rightDiff = null) => rightDiff === null
      ? leftDiff.content.length <= 3
      : leftDiff.content.length <= 3 && rightDiff.content.length <= 3,

    // If two diffs are without the same operation (INS or DEL) OR a single diff
    (leftDiff, rightDiff = null) => rightDiff === null ? true : (leftDiff.op !== rightDiff.op),

    // If the text match with the regex pattern
    (leftDiff, rightDiff = null) =>
      rightDiff === null
        ? RegExp(regexp.punctuation).test(leftDiff.content)
        : RegExp(regexp.punctuation).test(leftDiff.content) && RegExp(regexp.punctuation).test(rightDiff.content)
  ]
} */
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
      case algorithms.diffMatchPatch:
        result = new DiffMatchPatchAdapter(oldText, newText)
        break
      default:
        result = null
    }
    return result
  }
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
  makeDiff (listMechanicalOperations) {
    this.threeDiff = new ThreeDiff(listMechanicalOperations, this.oldText, this.newText)
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

    // Get Patches
    // https://github.com/google/diff-match-patch/wiki/API#patch_makediffs--patches
    this.patches = dmp.patch_make(this.diffs)

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
    this.makeDiff(this._getMechanicalOps())
  }

  /**
   *
   *
   * @memberof DiffMatchPatchAdapter
   */
  _getMechanicalOps () {
    let newDiffs = []

    // Iterate over patches
    for (let patch of this.patches) {
      // Set the absolute index
      let absoluteIndex = patch['start1']

      // Iterate over diffs
      patch['diffs'].map((diff, index) => {
        // Increase the current index by the length of current element, if it wasn't a DEL
        if (index > 0) {
          let previous = patch['diffs'][index - 1]
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
 * @class ThreeDiff
 */
class ThreeDiff {
  /**
   *Creates an instance of ThreeDiff.
   * @param {Array} listMechanicalOperations
   * @memberof ThreeDiff
   */
  constructor (listMechanicalOperations, oldText, newText) {
    // Save the list of all the mechanical operations
    this.listMechanicalOperations = listMechanicalOperations
    this.listStructuralOperations = []
    this.listSemanticOperations = []

    // Save the texts
    this.oldText = oldText
    this.newText = newText

    // Initialise the structural rules
    this.structuralRules = [

      // TextInsert or TextDelete
      diff => {
        return new StructuralDiff(diff.op === diffType.mechanical.ins ? diffType.structural.textInsert : diffType.structural.textDelete, [diff], this.listStructuralOperations.length)
      }
    ]

    // Execute the structural analysis
    this._executeStructuralAnalysis()
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
      // Remove the current diff from the list and get reference to it
      let leftDiff = newListMechanicalOperations.splice(leftIndex, 1)[0]

      // If the leftDiff is the last remaining diff
      if (newListMechanicalOperations.length === 0) { this.listStructuralOperations.push(this.structuralRules[this.structuralRules.length - 1](leftDiff)) }

      label:
      for (let rightDiff of newListMechanicalOperations) {
        // Iterate over rules
        for (let rule of this.structuralRules) {
          // If the current rule matches
          let ruleResult = rule(leftDiff, rightDiff)
          if (ruleResult !== false) {
            this.listStructuralOperations.push(ruleResult)
            break label
          }
        }
      }
    }
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
}

/**
 *
 *
 * @class Diff
 */
class Diff {
  /**
   *Creates an instance of Diff.
   * @param {*} operation
   * @param {*} type
   * @param {*} lastId
   * @memberof Diff
   */
  constructor (operation, type, lastId) {
    this.op = operation
    this.id = this._setId(type, lastId)
  }

  /**
   *
   *
   * @param {*} type
   * @param {*} lastId
   * @returns
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
  constructor (operation, content, position, lastId) {
    super(operation, diffType.mechanical.id, lastId)
    this.content = content
    this.pos = position
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
   * @param {*} operation
   * @param {*} mechanicalDiffs
   * @param {*} lastId
   * @param {string} [oldContext='']
   * @param {string} [newContext='']
   * @param {*} [by=globalUser]
   * @memberof StructuralDiff
   */
  constructor (operation, mechanicalDiffs, lastId, oldContext = '', newContext = '', by = globalUser) {
    super(operation, diffType.structural.id, lastId)
    this.by = by
    this.timestamp = Date.now()
    this.items = mechanicalDiffs
    this.old = oldContext
    this.new = newContext
  }
}
/* eslint-enable no-unused-vars */
