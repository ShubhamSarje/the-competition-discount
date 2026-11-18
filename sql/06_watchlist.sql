-- =====================================================================
-- 06_watchlist.sql  |  The Competition Discount
-- Business question 3 (THE WATCHLIST):
--   Which routes carry the most premium revenue at risk today?
--
-- Watchlist route (latest quarter, 2026Q1) must have:
--   - a full-service airline on top            (lg_group  = 'full_service')
--   - no low-cost airline as cheapest option   (low_group = 'full_service')
--   - a positive fare premium                  (fare above the low-cost benchmark for its band)
-- Revenue at risk (per quarter) = dominant airline's estimated quarterly revenue x 5.4%
--   5.4% = median incumbent revenue effect after a low-cost entry (05_entry_effect.sql, Part 2),
--   the conservative estimate. Reads as "expected loss IF a low-cost airline becomes cheapest",
--   not the chance that it will happen.
-- Requires: 03_premium.sql (the route_premium view).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Part 1: the watchlist view (one row per route, ranked)
-- ---------------------------------------------------------------------
create or replace view watchlist as
with latest as (
    select
        route_id, period, city1, city2, distance_band, nsmiles, passengers,
        carrier_lg_name                          as dominant_airline,
        large_ms                                 as dominant_share,
        fare, bench_fare, fare_premium,
        est_dominant_rev_q,
        round(est_dominant_rev_q * 0.054)        as revenue_at_risk_q
    from route_premium
    where period_index = (select max(period_index) from route_premium)
      and lg_group  = 'full_service'
      and low_group = 'full_service'
      and fare_premium > 0
)
select
    *,
    rank() over (order by revenue_at_risk_q desc)                                  as risk_rank,
    rank() over (partition by dominant_airline order by revenue_at_risk_q desc)   as rank_within_airline,
    -- running total, as a share of the whole watchlist (the Pareto curve)
    sum(revenue_at_risk_q) over (order by revenue_at_risk_q desc
                                 rows between unbounded preceding and current row)
        / sum(revenue_at_risk_q) over ()                                           as cumulative_share
from latest;


-- ---------------------------------------------------------------------
-- Part 2: the headline numbers
-- Result (2026Q1): 2,700 routes, $122.4M revenue at risk per quarter (about $490M a year).
--   The top 213 routes hold 50% of it; 1,048 routes hold 80%.
-- ---------------------------------------------------------------------
select
    count(*)                                                    as watchlist_routes,
    sum(revenue_at_risk_q)                                      as revenue_at_risk_per_quarter,
    sum(revenue_at_risk_q) * 4                                  as revenue_at_risk_per_year,
    min(risk_rank) filter (where cumulative_share >= 0.5)      as routes_holding_50pct,
    min(risk_rank) filter (where cumulative_share >= 0.8)      as routes_holding_80pct
from watchlist;


-- ---------------------------------------------------------------------
-- Part 3: the top 25 routes to protect
-- Result, top 3: New York-San Francisco (United, +44% premium, $7.7M/quarter at risk),
--   New York-Salt Lake City (Delta, $3.1M), Minneapolis-New York (Delta, $2.0M).
-- ---------------------------------------------------------------------
select
    risk_rank,
    city1 || ' - ' || city2                     as route,
    dominant_airline,
    round(100 * dominant_share)                 as dominant_share_pct,
    round(fare)                                 as fare,
    round(100 * fare_premium, 1)                as premium_pct,
    round(passengers)                           as passengers_per_day,
    revenue_at_risk_q
from watchlist
where risk_rank <= 25
order by risk_rank;


-- ---------------------------------------------------------------------
-- Part 4: exposure by airline (the Airline Scorecard view)
-- Result: Delta $48.9M (40%), American $43.9M (36%), United $28.2M (23%), Alaska $1.4M (1%) per quarter.
-- ---------------------------------------------------------------------
select
    dominant_airline,
    count(*)                                                                as routes,
    sum(revenue_at_risk_q)                                                  as revenue_at_risk_q,
    round(100 * sum(revenue_at_risk_q) / sum(sum(revenue_at_risk_q)) over (), 1) as pct_of_total,
    max(route_name) filter (where rank_within_airline = 1)                  as top_route
from (select *, city1 || ' - ' || city2 as route_name from watchlist) w
group by dominant_airline
order by revenue_at_risk_q desc;
