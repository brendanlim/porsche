import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.GEMINI_API_KEY = 'test-gemini-key'
process.env.BRIGHTDATA_USERNAME = 'test-user'
process.env.BRIGHTDATA_PASSWORD = 'test-pass'
process.env.NODE_ENV = 'test'