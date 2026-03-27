import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig.map((config) => {
    if (config.plugins?.['@typescript-eslint']) {
      return {
        ...config,
        rules: {
          ...config.rules,
          'no-console': 'error',
          '@typescript-eslint/no-explicit-any': 'error',
        },
      }
    }
    return config
  }),
]

export default eslintConfig
