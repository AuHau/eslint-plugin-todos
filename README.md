# eslint-plugin-todos [![npm version](https://badge.fury.io/js/eslint-plugin-todos.svg)](https://badge.fury.io/js/eslint-plugin-todos)

Contains single rule that detects TODO (or similar) comments which are not documented inside issue tracker (eq. have a link to an existing issue).

The link to the issue tracker can be either configured using `url` property of the rule's configuration, or is
automatically detected from the `package.json` using either `bugs` or `repository` properties. 

This plugin is based on the **no-warning-comments** rule. [Check out original documentation for no-warning-comments](http://eslint.org/docs/rules/no-warning-comments).

#### Fails

```js
// TODO: We may need to make this thing better
// TODO: Function fooBar need to return something good
// TODO: Wow!
```

#### Passes

```js
// TODO: Needs refactor https://github.com/auhau/eslint-plugin-todos/issues/4
// TODO: Waiting for https://github.com/auhau/eslint-plugin-todos/issues/2
```

## Install
```
npm install -D eslint-plugin-todos
```

## Usage
```js
module.exports = {
    "plugins": ["todos"],
    "rules": {
        'todos/only-documented-todos': [
            'warn', {
                'terms': ['todo'],
                'location': 'start',
                'url': 'https://github.com/auhau/eslint-plugin-todos'
            }
        ],
    }
}
```

## Credit

This rule was extended using [eslint-plugin-output-todo-comments](https://github.com/finom/eslint-plugin-output-todo-comments) by [finom](https://github.com/finom)
