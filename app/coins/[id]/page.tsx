import React from 'react';
import { fetcher, getPools } from '@/lib/coingecko.actions';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatCurrency, timeAgo } from '@/lib/utils';
import LiveDataWrapper from '@/components/LiveDataWrapper';
import Converter from '@/components/Converter';
import DataTable from '@/components/DataTable';

const Page = async ({ params }: NextPageProps) => {
  const { id } = await params;

  const [coinData, coinOHLCData] = await Promise.all([
    fetcher<CoinDetailsData>(`/coins/${id}`, {
      dex_pair_format: 'contract_address',
    }),
    fetcher<OHLCData[]>(`/coins/${id}/ohlc`, {
      vs_currency: 'usd',
      days: 1,
      interval: 'hourly',
      precision: 'full',
    }),
  ]);

  const platform = coinData.asset_platform_id
    ? coinData.detail_platforms?.[coinData.asset_platform_id]
    : null;
  const network = platform?.geckoterminal_url?.split('/')[3] || null;
  const contractAddress = platform?.contract_address || null;

  const pool = await getPools(id, network, contractAddress);

  const exchangeColumns: DataTableColumn<Ticker>[] = [
    {
      header: 'Exchange',
      cellClassName: 'exchange-name',
      cell: (ticker) => (
        <div className="relative">
          <p>{ticker.market.name}</p>
          {ticker.trade_url && (
            <Link href={ticker.trade_url} target="_blank" aria-label={ticker.market.name} />
          )}
        </div>
      ),
    },
    {
      header: 'Pair',
      cellClassName: 'pair',
      cell: (ticker) => (
        <p>
          {ticker.base}/{ticker.target}
        </p>
      ),
    },
    {
      header: 'Price',
      cellClassName: 'price-cell',
      cell: (ticker) => formatCurrency(ticker.converted_last?.usd),
    },
    {
      header: 'Time',
      cellClassName: 'time-cell',
      cell: (ticker) => (ticker.timestamp ? timeAgo(ticker.timestamp) : '-'),
    },
  ];

  const coinDetails = [
    {
      label: 'Market Cap',
      value: formatCurrency(coinData.market_data?.market_cap?.usd),
    },
    {
      label: 'Market Cap Rank',
      value: `# ${coinData.market_cap_rank ?? '-'}`,
    },
    {
      label: 'Total Volume',
      value: formatCurrency(coinData.market_data?.total_volume?.usd),
    },
    {
      label: 'Website',
      value: '-',
      link: coinData.links?.homepage?.[0] || '',
      linkText: 'Homepage',
    },
    {
      label: 'Explorer',
      value: '-',
      link: coinData.links?.blockchain_site?.[0] || '',
      linkText: 'Explorer',
    },
    {
      label: 'Community',
      value: '-',
      link: coinData.links?.subreddit_url || '',
      linkText: 'Community',
    },
  ];

  return (
    <main id="coin-details-page">
      <section className="primary">
        <LiveDataWrapper coinId={id} poolId={pool.id} coin={coinData} coinOHLCData={coinOHLCData}>
          {coinData.tickers && coinData.tickers.length > 0 && (
            <div className="exchange-section">
              <h4>Exchange Listings</h4>
              <DataTable
                columns={exchangeColumns}
                data={coinData.tickers.slice(0, 10)}
                rowKey={(ticker, index) =>
                  `${ticker.market.name}-${ticker.base}-${ticker.target}-${index}`
                }
                tableClassName="exchange-table"
              />
            </div>
          )}
        </LiveDataWrapper>
      </section>

      <section className="secondary">
        <Converter
          symbol={coinData.symbol}
          icon={coinData.image?.small || coinData.image?.large || ''}
          priceList={coinData.market_data?.current_price ?? {}}
        />

        <div className="details">
          <h4>Coin Details</h4>

          <ul className="details-grid">
            {coinDetails.map(({ label, value, link, linkText }, index) => (
              <li key={index}>
                <p className={label}>{label}</p>

                {link && link !== '' ? (
                  <div className="link">
                    <Link href={link} target="_blank">
                      {linkText || label}
                    </Link>
                    <ArrowUpRight size={16} />
                  </div>
                ) : (
                  <p className="text-base font-medium">{value}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
};
export default Page;
