// server/src/config/neonAI.ts
// Neon AI Gateway client
// One unified endpoint for frontier and open-source models powered by Databricks

const isAIGatewayConfigured = Boolean(
  process.env.NEON_AI_GATEWAY_BASE_URL && process.env.NEON_AI_GATEWAY_TOKEN,
);

/**
 * Fetches available AI models from the Neon AI Gateway catalog
 */
export async function fetchNeonAIModels(): Promise<Array<{ id: string }>> {
  if (!isAIGatewayConfigured) {
    throw new Error('NEON_AI_GATEWAY_BASE_URL or NEON_AI_GATEWAY_TOKEN is not configured.');
  }

  const url = `${process.env.NEON_AI_GATEWAY_BASE_URL}/v1/models`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.NEON_AI_GATEWAY_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`AI Gateway responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as { data?: Array<{ id: string }> };
  return data.data || [];
}

export { isAIGatewayConfigured };

