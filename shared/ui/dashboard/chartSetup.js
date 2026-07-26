import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// One-time registration, imported (for its side effect) by both
// ExecutionTrendChart.jsx and StatusMixDonut.jsx before they render.
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export { ChartJS };
