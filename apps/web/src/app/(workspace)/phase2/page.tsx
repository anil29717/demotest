'use client'
import {
  Brain, CreditCard, MessageSquare,
  TrendingUp,
  Building2, Zap, Clock
} from 'lucide-react'

const FEATURES = [
  {
    area: 'AI Intelligence',
    icon: Brain,
    color: '#7F77DD',
    items: [
      { name: 'AI Matching Engine',
        pct: 0, eta: 'Month 2-3' },
      { name: 'WhatsApp NLP',
        pct: 0, eta: 'Month 1' },
      { name: 'OCR Fraud Detection',
        pct: 0, eta: 'Month 3' },
      { name: 'Institutional Valuation',
        pct: 0, eta: 'Month 4' },
    ]
  },
  {
    area: 'Financial Infrastructure',
    icon: CreditCard,
    color: '#F0922B',
    items: [
      { name: 'Real Stripe Billing',
        pct: 30, eta: 'Month 1' },
      { name: 'Escrow Module',
        pct: 0, eta: 'Month 2' },
      { name: 'Transaction Fee',
        pct: 0, eta: 'Month 2' },
      { name: 'Razorpay Gateway',
        pct: 0, eta: 'Month 2' },
    ]
  },
  {
    area: 'Communication',
    icon: MessageSquare,
    color: '#E85D8A',
    items: [
      { name: 'In-platform Chat',
        pct: 0, eta: 'Month 3' },
      { name: 'Regional Languages',
        pct: 5, eta: 'Month 8' },
    ]
  },
  {
    area: 'Infrastructure & Scale',
    icon: Zap,
    color: '#378ADD',
    items: [
      { name: 'Full Elasticsearch',
        pct: 20, eta: 'Month 4' },
      { name: 'Portal Crawler',
        pct: 0, eta: 'Month 5' },
      { name: 'Microservices',
        pct: 0, eta: 'Month 7' },
      { name: 'External API',
        pct: 0, eta: 'Month 6' },
    ]
  },
  {
    area: 'Advanced Intelligence',
    icon: TrendingUp,
    color: '#00C49A',
    items: [
      { name: 'Reputation Graph',
        pct: 20, eta: 'Month 4' },
      { name: 'HNI Portfolio IRR',
        pct: 15, eta: 'Month 4' },
      { name: 'Regulatory AI',
        pct: 0, eta: 'Month 5' },
    ]
  },
  {
    area: 'Vertical Deepening',
    icon: Building2,
    color: '#5BAD8F',
    items: [
      { name: 'Builder Portal',
        pct: 0, eta: 'Month 5' },
      { name: 'NRI Concierge',
        pct: 25, eta: 'Month 7' },
      { name: 'IRM Premium',
        pct: 10, eta: 'Month 7' },
    ]
  },
]

export default function Phase2Page() {
  const overall = 6

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold
          text-white mb-2">
          Phase 2 Roadmap
        </h1>
        <p className="text-sm text-gray-400">
          AI intelligence · Financial rails ·
          Scale infrastructure
        </p>
      </div>

      {/* Overall progress */}
      <div className="bg-[#111111] border
        border-[#1a1a1a] rounded-xl p-5 mb-6">
        <div className="flex items-center
          justify-between mb-3">
          <span className="text-sm font-medium
            text-white">
            Overall Phase 2 completion
          </span>
          <span className="text-2xl font-bold
            text-amber-400">
            {overall}%
          </span>
        </div>
        <div className="h-2 bg-[#1a1a1a]
          rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400
              rounded-full transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          21 features · 6 areas ·
          Est. 6-9 months total
        </p>
      </div>

      {/* Feature areas */}
      <div className="space-y-4">
        {FEATURES.map(area => {
          const Icon = area.icon
          const avgPct = Math.round(
            area.items.reduce(
              (sum, i) => sum + i.pct, 0
            ) / area.items.length
          )
          return (
            <div key={area.area}
              className="bg-[#111111] border
                border-[#1a1a1a] rounded-xl
                overflow-hidden">
              <div className="flex items-center
                gap-3 p-4 border-b
                border-[#1a1a1a]">
                <Icon size={16}
                  style={{ color: area.color }} />
                <span className="text-sm
                  font-medium text-white flex-1">
                  {area.area}
                </span>
                <span className="text-xs
                  font-semibold"
                  style={{ color: area.color }}>
                  {avgPct}%
                </span>
              </div>
              <div className="divide-y
                divide-[#1a1a1a]">
                {area.items.map(item => (
                  <div key={item.name}
                    className="flex items-center
                      gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center
                        justify-between mb-1">
                        <span className="text-xs
                          text-gray-300">
                          {item.name}
                        </span>
                        <div className="flex items-center
                          gap-2">
                          <span className="text-xs
                            text-gray-500
                            flex items-center gap-1">
                            <Clock size={10} />
                            {item.eta}
                          </span>
                          <span className="text-xs
                            font-medium text-gray-400">
                            {item.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1
                        bg-[#1a1a1a] rounded-full
                        overflow-hidden">
                        <div
                          className="h-full
                            rounded-full transition-all"
                          style={{
                            width: `${item.pct}%`,
                            background: area.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 bg-[#111111] border
        border-[#1a1a1a] rounded-xl p-4
        text-center">
        <p className="text-xs text-gray-500">
          Phase 1 complete · Phase 2 starting Q2 2026
        </p>
        <p className="text-xs text-gray-600 mt-1">
          See doc/06_Phase2_Roadmap.md for full details
        </p>
      </div>
    </div>
  )
}
