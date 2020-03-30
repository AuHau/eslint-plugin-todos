/**
 * @fileoverview Rule that warns about used warning comments
 * @author Alexander Schmidt <https://github.com/lxanders>
 */

'use strict'

const { escapeRegExp } = require('lodash')
const readPkgUp = require('read-pkg-up')
const ellipsize = require('ellipsize');

function isDirectiveComment (node) {
  const comment = node.value.trim()

  return (
    node.type === 'Line' && comment.indexOf('eslint-') === 0 ||
    node.type === 'Block' && (
      comment.indexOf('global ') === 0 ||
      comment.indexOf('eslint ') === 0 ||
      comment.indexOf('eslint-') === 0
    )
  )
}

function getRepoUrl () {
  const packageJson = readPkgUp.sync().packageJson

  if (packageJson.bugs) {
    if (typeof packageJson.bugs === 'string') {
      return packageJson.bugs
    }

    if (packageJson.bugs.url) {
      return packageJson.bugs.url
    }
  }

  if (packageJson.repository) {
    if (typeof packageJson.repository === 'string') {
      return packageJson.repository
    }

    if (packageJson.resolutions.url) {
      return packageJson.repository.url
    }
  }

  return undefined
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const ruleDef = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'disallow specified warning terms in comments without proper documentation',
      category: 'Best Practices',
      recommended: false
    },

    schema: [
      {
        type: 'object',
        properties: {
          terms: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          location: {
            enum: ['start', 'anywhere']
          },
          url: {
            type: 'string'
          }
        },
        additionalProperties: false
      }
    ]
  },

  create (context) {

    const sourceCode = context.getSourceCode(),
      configuration = context.options[0] || {},
      warningTerms = configuration.terms || ['todo', 'fixme', 'xxx'],
      location = configuration.location || 'start',
      selfConfigRegEx = /\bno-warning-comments\b/u,
      repoUrl = configuration.url || getRepoUrl(),
      repoUrlRegEx = repoUrl ? new RegExp(`${escapeRegExp(repoUrl.trim())}`, 'iu') : undefined

    /**
     * Convert a warning term into a RegExp which will match a comment containing that whole word in the specified
     * location ("start" or "anywhere"). If the term starts or ends with non word characters, then the match will not
     * require word boundaries on that side.
     * @param {string} term A term to convert to a RegExp
     * @returns {RegExp} The term converted to a RegExp
     */
    function convertToRegExp (term) {
      const escaped = escapeRegExp(term)
      const wordBoundary = '\\b'
      const eitherOrWordBoundary = `|${wordBoundary}`
      let prefix

      /*
       * If the term ends in a word character (a-z0-9_), ensure a word
       * boundary at the end, so that substrings do not get falsely
       * matched. eg "todo" in a string such as "mastodon".
       * If the term ends in a non-word character, then \b won't match on
       * the boundary to the next non-word character, which would likely
       * be a space. For example `/\bFIX!\b/.test('FIX! blah') === false`.
       * In these cases, use no bounding match. Same applies for the
       * prefix, handled below.
       */
      const suffix = (/\w$/u.test(term) ? '\\b' : '') + ':?'

      if (location === 'start') {

        /*
         * When matching at the start, ignore leading whitespace, and
         * there's no need to worry about word boundaries.
         */
        prefix = '^\\s*'
      } else if (/^\w/u.test(term)) {
        prefix = wordBoundary
      } else {
        prefix = ''
      }

      if (location === 'start') {

        /*
         * For location "start" the regex should be
         * ^\s*TERM\b.  This checks the word boundary
         * at the beginning of the comment.
         */
        return new RegExp(prefix + escaped + suffix, 'iu')
      }

      /*
       * For location "anywhere" the regex should be
       * \bTERM\b|\bTERM\b, this checks the entire comment
       * for the term.
       */
      return new RegExp(prefix + escaped + suffix + eitherOrWordBoundary + term + wordBoundary, 'iu')
    }

    const warningRegExps = warningTerms.map(convertToRegExp)

    /**
     * Checks the specified comment for matches of the configured warning terms and returns the matches.
     * @param {string} comment The comment which is checked.
     * @returns {boolean} If comment has unwanted term.
     */
    function getUndocumentedTodoMessage (comment) {
      for (const regex of warningRegExps) {
        if (regex.test(comment) && !commentHasIssue(comment)) {
          const fullMessage = comment.replace(regex, '')
          return ellipsize(fullMessage.trim(), 60)
        }
      }

      return false
    }

    function commentHasIssue (comment) {
      if (!repoUrlRegEx) {
        return false
      }

      return repoUrlRegEx.test(comment)
    }

    /**
     * Checks the specified node for matching warning comments and reports them.
     * @param {ASTNode} node The AST node being checked.
     * @returns {void} undefined.
     */
    function checkComment (node) {
      if (isDirectiveComment(node) && selfConfigRegEx.test(node.value)) {
        return
      }

      const todoMessage = getUndocumentedTodoMessage(node.value)
      if (todoMessage) {
        context.report({
          node,
          message: `Undocumented TODO: ${todoMessage}`
        })
      }
    }

    return {
      Program () {
        const comments = sourceCode.getAllComments()

        comments
          .filter(token => token.type !== 'Shebang')
          .forEach(checkComment)
      }
    }
  }
}

module.exports = {
  rules: {
    'only-documented-todos': ruleDef
  }
}
