'use server';

import qs from 'query-string';

const getBaseUrl = () => (process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3').trim();
const getApiKey = () => (process.env.COINGECKO_API_KEY || '').trim();

export async function fetcher<T>(
  endpoint: string,
  params?: QueryParams,
  revalidate = 60,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  // Make sure we don't create // between baseUrl and endpoint
  const url = qs.stringifyUrl(
    {
      url: `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`,
      query: params,
    },
    {
      skipEmptyString: true,
      skipNull: true,
    },
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    const isDemoKey = apiKey.startsWith('CG-') || baseUrl.includes('api.coingecko.com');
    const headerName = isDemoKey ? 'x-cg-demo-api-key' : 'x-cg-pro-api-key';
    headers[headerName] = apiKey;
  }

  const response = await fetch(url, {
    headers,
    next: { revalidate },
  });

  if (!response.ok) {
    const errorBody: CoinGeckoErrorBody = await response.json().catch(() => ({}));

    throw new Error(
      `API Error: ${response.status}: ${errorBody.error || response.statusText}`,
    );
  }

  return response.json();
}

export async function getPools(
  id: string,
  network?: string | null,
  contractAddress?: string | null,
): Promise<PoolData> {
  const fallback: PoolData = {
    id: '',
    address: '',
    name: '',
    network: '',
  };

  if (network && contractAddress) {
    try {
      const poolData = await fetcher<{ data: PoolData[] }>(
        `/onchain/networks/${network}/tokens/${contractAddress}/pools`,
      );

      return poolData.data?.[0] ?? fallback;
    } catch (error) {
      console.log('Error fetching pool data:', error);
      return fallback;
    }
  }

  try {
    const poolData = await fetcher<{ data: PoolData[] }>(
      '/onchain/search/pools',
      { query: id },
    );

    return poolData.data?.[0] ?? fallback;
  } catch (error) {
    console.log('Error searching pools:', error);
    return fallback;
  }
}

export async function searchCoins(query: string): Promise<SearchCoin[]> {
  if (!query || query.trim() === '') return [];

  try {
    const data = await fetcher<{ coins: SearchCoin[] }>(
      '/search',
      { query: query.trim() },
      120,
    );

    return data?.coins ?? [];
  } catch (error) {
    console.error('Error searching coins:', error);
    return [];
  }
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const data = await fetcher<{ coins: TrendingCoin[] }>(
      '/search/trending',
      undefined,
      300,
    );

    return data?.coins ?? [];
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    return [];
  }
}