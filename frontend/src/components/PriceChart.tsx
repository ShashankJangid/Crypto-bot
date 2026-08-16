import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceData {
  time: string;
  price: number;
}

interface PriceChartProps {
  tokenName: string;
  currentPrice: number;
  change24h: number;
  data: PriceData[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ tokenName, currentPrice, change24h, data }) => {
  const isPositive = change24h >= 0;
  const color = isPositive ? '#39ff14' : '#ff003c';

  const chartData = {
    labels: data.map(d => d.time),
    datasets: [
      {
        label: `${tokenName} Price`,
        data: data.map(d => d.price),
        borderColor: color,
        backgroundColor: `${color}33`,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: false, // Auto-scrolling effect by hiding x-axis labels
      },
      y: {
        grid: { color: '#334155' },
        ticks: { color: '#94a3b8' }
      }
    },
    animation: { duration: 0 }
  };

  return (
    <div className="bg-crypto-card p-4 rounded-lg border border-gray-700 h-64 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">{tokenName}</h3>
        <div className="text-right">
          <div className="text-xl font-mono">${currentPrice.toFixed(4)}</div>
          <div className={`text-sm ${isPositive ? 'neon-text-green' : 'neon-text-red'}`}>
            {isPositive ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="flex-1 relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Waiting for data...
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};
