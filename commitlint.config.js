/**
 * Conventional Commits enforcement.
 * Allowed types mirror .gitmessage: feat, fix, refactor, chore, test, docs, style, perf.
 * Subject in French (présent), body in short English — casing rules relaxed for FR subjects.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'chore', 'test', 'docs', 'style', 'perf'],
    ],
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
