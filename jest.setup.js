// jest.setup.js (ES import for dotenv to fix @typescript-eslint/no-require-imports)
import('dotenv').then(dotenv => dotenv.config({ path: '.env.local' }));