// ESLint flat config — replaces .eslintrc.json + .eslintignore
// Project is CommonJS (`"type": "commonjs"` in package.json)
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier/flat');

module.exports = [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 2021,
            // Source files use `import`/`export` (loaded as ES modules by SillyTavern).
            // The `package.json` "type" field is for Node, not the browser-loaded extension.
            sourceType: 'module',
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                sessionStorage: 'readonly',
                localStorage: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                XMLHttpRequest: 'readonly',
                FileReader: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                MutationObserver: 'readonly',
                // SillyTavern globals
                toastr: 'readonly',
                SillyTavern: 'readonly',
                getContext: 'readonly',
                getRequestHeaders: 'readonly',
                saveSettingsDebounced: 'readonly',
                saveChat: 'readonly',
                getCurrentChatId: 'readonly',
                setCurrentChatId: 'readonly',
                eventOn: 'readonly',
                eventOff: 'readonly',
                eventEmit: 'readonly',
                eventSource: 'readonly',
                // Node globals (already in recommended, but explicit)
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                global: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { args: 'after-used', ignoreRestSiblings: true }],
            'no-undef': 'error',
            'eqeqeq': ['warn', 'always', { null: 'ignore' }],
            'no-console': 'off',
            'no-debugger': 'warn',
            'no-var': 'error',
            'prefer-const': 'warn',
            'no-duplicate-imports': 'error',
            'no-shadow': 'warn',
            'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
            'no-throw-literal': 'error',
            'no-return-await': 'warn',
            'no-promise-executor-return': 'error',
            'no-unreachable': 'error',
            'no-constant-condition': 'warn',
        },
    },
    {
        ignores: [
            'node_modules/**',
            'archive/**',
            '**/*.backup.*',
            'coverage/**',
            'dist/**',
            'build/**',
            'sillytavern-docs/**',
        ],
    },
];
