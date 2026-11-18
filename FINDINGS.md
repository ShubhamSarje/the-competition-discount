# FINDINGS: The Competition Discount

> **Data:** US DOT Domestic Airfare Consumer Report, Table 6. 167,884 route-quarters, 8,474 city-pair routes, 2019 Q1 to 2026 Q1 (2020–2021 excluded from comparisons because of COVID). All figures are calculated from this data; revenue figures are estimates (passengers × fare, taxes and fees included).

## Headline

**When a low-cost airline becomes the cheapest option on a route, the route grows, but the full-service incumbent loses: about 5% of its revenue where it keeps the top spot, and in 1 of 3 cases the top spot itself within a year. Across 2,700 premium routes, that puts an estimated $122M per quarter (about $490M a year) at risk, half of it on just 213 routes.**

## Headline metrics

| Metric | Value | Source |
|---|---|---|
| Fare premium on routes with no low-cost competition, 2026 Q1 (passenger-weighted) | 12.8%, the lowest quarter in the data (peak 33.2% in 2022 Q3) | `03_premium.sql` |
| Largest premium by distance (passenger-weighted, average across quarters) | 500–1,000 mi: 23.7% · 1,000–1,500 mi: 25.7% | `03_premium.sql` |
| Clean low-cost entry events analysed | 193 (2023 Q1 to 2025 Q1) | `04_entry_events.sql` |
| Effect of an entry on fares / passengers / route revenue | −3.7% / +7.3% / +2.5% | `05_entry_effect.sql` |
| Effect on the incumbent's own revenue (same airline on top throughout) | −5.4% (middle half −14.3% to +3.7%) | `05_entry_effect.sql` |
| Top airline different a year after entry | 62 of 193 (32%); the low-cost airline itself on top in 34 (18%) | `04_entry_events.sql` |
| Watchlist routes / revenue at risk per quarter | 2,700 / $122.4M | `06_watchlist.sql` |
| Routes holding 50% / 80% of the risk | 213 / 1,048 | `06_watchlist.sql` |

## Question 1: the premium

Routes where the cheapest airline is full-service charge more than low-cost routes of similar distance in the same quarter, in every distance band.

| Distance band | Typical route (median) | Passenger-weighted | Weighted range by quarter |
|---|---|---|---|
| 0–500 mi | +27.0% | +14.3% | −4.4% to +44.5% |
| 500–1,000 mi | +25.6% | +23.7% | +15.2% to +32.5% |
| 1,000–1,500 mi | +21.3% | +25.7% | +15.6% to +36.2% |
| 1,500+ mi | +13.7% | +15.1% | +7.6% to +22.9% |

The premium was about 15% in 2019, rose to 33.2% in 2022 Q3 and has fallen since, to 12.8% in 2026 Q1. The data shows the decline, not its cause.

## Question 2: the entry effect

Median change from the 4 quarters before to the 4 quarters after a low-cost airline becomes the cheapest option, minus the median change on similar routes with no entry (difference-in-differences).

| Distance band | Events | Fare | Passengers | Route revenue | Top airline's revenue | Top airline's share |
|---|---|---|---|---|---|---|
| 0–500 mi | 28 | −4.8% | +14.4% | +4.2% | −1.3% | −4.6 pts |
| 500–1,000 mi | 52 | −13.8% | +27.8% | +9.3% | −9.8% | −4.9 pts |
| 1,000–1,500 mi | 35 | −4.8% | +5.9% | +0.8% | −11.0% | −3.3 pts |
| 1,500+ mi | 78 | −1.2% | −0.2% | +0.7% | −9.0% | −5.1 pts |
| **All** | **193** | **−3.7%** | **+7.3%** | **+2.5%** | **−9.0%** | **−4.6 pts** |

**Two kinds of threat** (`07_robustness.sql`, Check A):

| Who became the cheapest option | Events | Fare | Passengers | Route revenue | Incumbent revenue (same leader) |
|---|---|---|---|---|---|
| Ultra-low-cost airlines (Breeze, Frontier, Allegiant, Avelo, Spirit, Sun Country) | 96 | −13.5% | +26.7% | +7.7% | −1.5% (33 events, thin) |
| Southwest | 97 | −0.2% | −2.9% | −2.0% | −8.4% (56 events) |

Ultra-low-cost airlines cut fares and grow the market. Southwest barely moves fares but takes share. The incumbent loses revenue in both cases.

## Question 3: the watchlist

Routes in 2026 Q1 where a full-service airline is on top, no low-cost airline is the cheapest option, and the fare is above the low-cost benchmark. Revenue at risk = the dominant airline's estimated quarterly revenue × 5.4%.

| Rank | Route | Top airline | Share | Fare | Premium | At risk / quarter |
|---|---|---|---|---|---|---|
| 1 | New York – San Francisco | United | 37% | $518 | +44.3% | $7.7M |
| 2 | New York – Salt Lake City | Delta | 56% | $430 | +19.7% | $3.1M |
| 3 | Minneapolis/St. Paul – New York | Delta | 75% | $342 | +16.2% | $2.0M |
| 4 | Philadelphia – San Francisco | American | 62% | $368 | +2.5% | $1.2M |
| 5 | Atlanta – San Diego | Delta | 64% | $391 | +9.0% | $1.2M |

By airline: Delta $48.9M (40%), American $43.9M (36%), United $28.2M (23%), Alaska $1.4M (1%) per quarter.

## Recommendations

| # | Recommendation | Evidence | Expected impact | How to measure |
|---|---|---|---|---|
| 1 | **Put the top 213 watchlist routes on a quarterly competitive review**, with a pre-agreed response plan for each, starting with New York–San Francisco. | 213 routes hold 50% of the $122M quarterly risk; NYC–SFO alone is 6%. | Earlier, planned responses on the routes that hold half the exposure. | Each quarter: dominant share and revenue on these routes vs. matched control routes. |
| 2 | **Respond by competitor type, not with blanket fare cuts.** Against ultra-low-cost entrants, protect the higher-paying segment rather than matching fares everywhere. Against Southwest, price cuts are unlikely to work, because Southwest is not competing on fare on these routes. | Ultra-low-cost entries: fares −13.5%, passengers +26.7%, incumbent revenue −1.5%. Southwest entries: fares −0.2%, incumbent revenue −8.4%. | Avoids giving away fare where the market grows anyway, and focuses non-price efforts where share is the threat. | Incumbent revenue and share change after each new entry, split by entrant type. |
| 3 | **Re-baseline pricing targets and forecasts for a thinner premium.** Prioritise the 500–1,500-mile routes, where the premium and the entry losses are largest. | The premium fell from 33.2% (2022 Q3) to 12.8% (2026 Q1). Mid-distance routes carry a 24–26% premium and the largest revenue losses after entry (−9.8% to −11.0%). | Forecasts that don't assume a premium the market no longer pays. | Quarterly premium by band (`03_premium.sql`, Part 3) against the forecast. |

## Robustness

- **JetBlue counted as low-cost:** 204 events; incumbent revenue −5.2% (vs −5.4%). Same picture.
- **Fare per mile instead of fare:** median premium 12–34% by band. Same picture.
- **Gaps in route history:** 7.6% of rows follow a skipped quarter; only consecutive quarters are compared. Routes present in all 29 quarters carry 89.3% of passengers.

## Limitations

- **US domestic data only.** The method carries over to Canada; the numbers do not.
- **"Becomes the cheapest option"** covers both a new entry and a low-cost airline already on the route cutting fares; the data can't separate them.
- **Only the largest and the cheapest airline are visible on each route.** A low-cost airline flying at a higher fare is invisible, and so is any airline in between.
- **Small samples by band:** 28–78 entry events per band; treat band figures as directional and the overall figures as the main result.
- **Association, not proof of cause.** Low-cost airlines choose which routes to enter. The control group removes market-wide moves but not that choice.
- **Revenue is estimated** from average fares (taxes, fees and first class included) and is suitable for ranking, not accounting.
- **Revenue at risk is the expected loss if an entry happens**, not the probability that it will.

## Next steps

1. Model the probability of entry per route (for example, low-cost airlines already serving both cities), so the watchlist ranks by expected loss × likelihood.
2. Repeat the analysis on Canadian routes with internal airline data.
3. Track the premium quarterly as new DOT releases arrive.
