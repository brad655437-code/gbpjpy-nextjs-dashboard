import { PredictionCard } from '@/components/dashboard/prediction-card';
import { PerformanceMetrics } from '@/components/dashboard/performance-metrics';
import { BarChart3, TrendingUp, Brain } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              GBP/JPY Prediction Dashboard
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI-powered currency prediction using Ichimoku Cloud and RSI technical analysis. 
            Monitor real-time predictions, track performance metrics, and analyze market trends.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>Live Predictions</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>Performance Tracking</span>
            </div>
            <div className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              <span>ML-Powered Analysis</span>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Today's Prediction
            </h2>
            <PredictionCard />
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-green-600" />
              Performance Analytics
            </h2>
            <PerformanceMetrics />
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-yellow-800 font-semibold mb-2">⚠️ Important Disclaimer</div>
            <div className="text-yellow-700 text-sm leading-relaxed">
              This application is for educational and informational purposes only. The predictions and analysis 
              provided should not be considered as financial advice. Currency trading involves substantial risk 
              and may result in significant losses. Always consult with qualified financial professionals before 
              making investment decisions.
            </div>
          </div>
          
          <div className="text-gray-500 text-sm">
            <p>© 2025 GBP/JPY Prediction Dashboard. Built with Next.js, TypeScript, and Tailwind CSS.</p>
            <p className="mt-1">Powered by Ichimoku Cloud and RSI technical analysis algorithms.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
