-- =====================================================================
-- 03_premium.sql  |  The Competition Discount
-- Business question 1 (THE PREMIUM):
--   How much more do routes without low-cost competition charge than
--   similar routes that have it?
-- "Similar" = same distance band AND same quarter. 2020-2021 excluded (COVID).
-- "No low-cost competition" = cheapest airline is full-service (low_group = 'full_service').
-- =====================================================================


-- ---------------------------------------------------------------------
-- Part 1: route-level premium, saved as a VIEW (reused by the watchlist and the RouteIQ tool)
--   benchmark fare = median fare of low-cost routes in the same band and quarter
--   fare_premium   = (route fare - benchmark) / benchmark
-- Gotcha: in Postgres, PERCENTILE_CONT is an ordered-set aggregate. It cannot be used
-- as a window function (no "... OVER (PARTITION BY ...)"), so the medians are computed
-- in a grouped CTE and joined back to every route.
-- ---------------------------------------------------------------------
create or replace view route_premium as
with benchmark as (
    select
        distance_band,
        period_index,
        percentile_cont(0.5) within group (order by fare)::numeric as bench_fare,
        count(*)                                                    as bench_routes
    from route_quarters
    where lcc_present
      and not covid_flag
    group by distance_band, period_index
)
select
    r.route_id, r.period, r.period_index, r.city1, r.city2,
    r.distance_band, r.nsmiles, r.passengers,
    r.fare, r.fare_per_mile,
    r.carrier_lg, r.carrier_lg_name, r.lg_group, r.large_ms, r.fare_lg,
    r.carrier_low, r.carrier_low_name, r.low_group, r.lcc_present,
    r.est_dominant_rev_q,
    b.bench_fare,
    b.bench_routes,
    round((r.fare - b.bench_fare) / b.bench_fare, 4) as fare_premium
from route_quarters r
join benchmark b using (distance_band, period_index)
where not r.covid_flag;


-- ---------------------------------------------------------------------
-- Part 2: the premium by distance band, two views
--   route view        = typical route (median fare, every route counts once)
--   passenger-weighted = where the passengers (and revenue) actually are
-- Method: compare the two groups inside each band x quarter, then average across 21 quarters.
--
-- Result:
--   band        route view   pax-weighted   pax-weighted range by quarter
--   0-500         27.0%         14.3%          -4.4% to 44.5%
--   500-1000      25.6%         23.7%          15.2% to 32.5%
--   1000-1500     21.3%         25.7%          15.6% to 36.2%
--   1500+         13.7%         15.1%           7.6% to 22.9%
-- Robustness: a fare-per-mile benchmark gives the same picture (median premium 12% to 34%).
-- ---------------------------------------------------------------------
with by_band_quarter as (
    select
        distance_band,
        period_index,
        -- FILTER (WHERE ...) runs one aggregate on a subset of rows: two groups in one pass
        sum(fare * passengers) filter (where low_group = 'full_service')
            / nullif(sum(passengers) filter (where low_group = 'full_service'), 0)          as fs_wtd_fare,
        sum(fare * passengers) filter (where low_group = 'low_cost')
            / nullif(sum(passengers) filter (where low_group = 'low_cost'), 0)              as lcc_wtd_fare,
        percentile_cont(0.5) within group (order by fare) filter (where low_group = 'full_service') as fs_med_fare,
        percentile_cont(0.5) within group (order by fare) filter (where low_group = 'low_cost')     as lcc_med_fare,
        sum(passengers) filter (where low_group = 'full_service')                          as fs_pax,
        sum(passengers) filter (where low_group = 'low_cost')                              as lcc_pax
    from route_quarters
    where not covid_flag
    group by distance_band, period_index
)
select
    distance_band,
    count(*)                                                          as quarters,
    round(avg(fs_med_fare)::numeric, 0)                               as no_lcc_median_fare,
    round(avg(lcc_med_fare)::numeric, 0)                              as lcc_median_fare,
    round(100 * avg(fs_med_fare / lcc_med_fare - 1)::numeric, 1)      as premium_route_view_pct,
    round(avg(fs_wtd_fare)::numeric, 0)                               as no_lcc_wtd_fare,
    round(avg(lcc_wtd_fare)::numeric, 0)                              as lcc_wtd_fare,
    round(100 * avg(fs_wtd_fare / lcc_wtd_fare - 1)::numeric, 1)      as premium_pax_weighted_pct,
    round(100 * min(fs_wtd_fare / lcc_wtd_fare - 1)::numeric, 1)      as min_quarter_pct,
    round(100 * max(fs_wtd_fare / lcc_wtd_fare - 1)::numeric, 1)      as max_quarter_pct,
    round(100 * sum(fs_pax) / (sum(fs_pax) + sum(lcc_pax)), 1)        as pct_pax_on_no_lcc_routes
from by_band_quarter
group by distance_band
order by array_position(array['0-500', '500-1000', '1000-1500', '1500+'], distance_band);   -- natural order, not alphabetical


-- ---------------------------------------------------------------------
-- Part 3: how the premium has moved over time (all bands, passenger-weighted)
-- Result: about 15% in 2019, peaked at 33.2% in 2022Q3, down to 12.8% in 2026Q1,
-- the lowest quarter in the data.
-- ---------------------------------------------------------------------
with by_band_quarter as (
    select
        period,
        period_index,
        distance_band,
        sum(fare * passengers) filter (where low_group = 'full_service')
            / nullif(sum(passengers) filter (where low_group = 'full_service'), 0) as fs_wtd_fare,
        sum(fare * passengers) filter (where low_group = 'low_cost')
            / nullif(sum(passengers) filter (where low_group = 'low_cost'), 0)     as lcc_wtd_fare,
        sum(passengers) filter (where low_group in ('full_service', 'low_cost'))  as pax
    from route_quarters
    where not covid_flag
    group by period, period_index, distance_band
)
select
    period,
    round(100 * (sum((fs_wtd_fare / lcc_wtd_fare - 1) * pax) / sum(pax))::numeric, 1) as premium_pax_weighted_pct
from by_band_quarter
group by period, period_index
order by period_index;
