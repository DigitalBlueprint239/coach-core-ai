module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2022,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
  },
  overrides: [
    {
      files: ["**/*.spec.*", "test/**/*.js"],
      env: {
        mocha: true,
      },
      rules: {
        "max-len": "off",
        "require-jsdoc": "off",
        "valid-jsdoc": "off",
      },
    },
  ],
  globals: {},
};
