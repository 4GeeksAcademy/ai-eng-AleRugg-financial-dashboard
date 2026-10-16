import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IncomeOutcomeChart } from './income-outcome-chart'
import { ProfitPercentChart } from './profit-percent-chart'
import type { MonthlyDataPoint } from '@/lib/financial-types'

const zeroValuePoint: MonthlyDataPoint = {
  month: 'Jan 2026',
  income: 0,
  outcome: 0,
  profitPercent: 0,
}

describe('financial charts empty states', () => {
  it('renders a zero-valued data point instead of the empty state', () => {
    const incomeMarkup = renderToStaticMarkup(
      createElement(IncomeOutcomeChart, { data: [zeroValuePoint] }),
    )
    const profitMarkup = renderToStaticMarkup(
      createElement(ProfitPercentChart, { data: [zeroValuePoint] }),
    )

    expect(incomeMarkup).not.toContain('No data available to display')
    expect(profitMarkup).not.toContain('No data available to display')
    expect(profitMarkup).toContain('0.0%')
  })

  it('shows the empty state when there are no monthly data points', () => {
    expect(
      renderToStaticMarkup(createElement(IncomeOutcomeChart, { data: [] })),
    ).toContain('No data available to display')
    expect(
      renderToStaticMarkup(createElement(ProfitPercentChart, { data: [] })),
    ).toContain('No data available to display')
  })
})