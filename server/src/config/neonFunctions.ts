// server/src/config/neonFunctions.ts
// Client to invoke Neon serverless functions deployed on the branch

const FUNCTION_BASE_URL =
  process.env.NEON_BRANCH_ID && process.env.NEON_FUNCTION_HOST_SUFFIX
    ? `https://${process.env.NEON_BRANCH_ID}-hello${process.env.NEON_FUNCTION_HOST_SUFFIX}`
    : 'https://br-little-sea-bd7sk2zo-hello.compute.c-8.us-east-2.aws.neon.tech';

/**
 * Invokes the deployed 'hello' Neon Function
 */
export async function invokeNeonHelloFunction(): Promise<{
  status: number;
  message: string;
}> {
  const response = await fetch(`${FUNCTION_BASE_URL}/`);
  const text = await response.text();
  return {
    status: response.status,
    message: text.trim(),
  };
}

