-- =====================================================================
-- 02_validation.sql  |  The Competition Discount
-- Purpose: prove the quarter-over-quarter logic is safe before using it.
-- Key idea: LAG() returns the previous ROW, which is not always the previous QUARTER.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Example 1: quarter-over-quarter fare change on one route
-- Allentown/Bethlehem/Easton, PA <-> Dallas/Fort Worth, TX
-- Result: 2020Q2 is missing (period_index jumps 8080 -> 8082),
-- so the 2020Q3 row is silently compared with 2020Q1.
-- ---------------------------------------------------------------------
select
    route_id,
    period,
    period_index,
    round(fare, 2)                                                                 as fare,
    round(lag(fare) over (partition by route_id order by period_index), 2)        as prev_fare,
    round(fare - lag(fare) over (partition by route_id order by period_index), 2) as fare_change
from route_quarters
where route_id = '30135-30194'
order by period_index;


-- ---------------------------------------------------------------------
-- Check 2: how many rows follow a gap?
-- Result (2019Q1-2026Q1, 167,884 rows):
--   consecutive        146,715  (87.4%)
--   after_gap           12,695  ( 7.6%)
--   first_appearance     8,474  ( 5.0%)  = number of routes, as expected
-- ---------------------------------------------------------------------
with with_prev as (
    select
        route_id,
        period_index,
        lag(period_index) over (partition by route_id order by period_index) as prev_index
    from route_quarters
)
select
    case
        when prev_index is null              then 'first_appearance'
        when period_index - prev_index = 1   then 'consecutive'
        else                                      'after_gap'
    end                                                    as row_type,
    count(*)                                               as row_count,
    round(100.0 * count(*) / sum(count(*)) over (), 1)     as pct_of_rows
from with_prev
group by 1
order by row_count desc;


-- ---------------------------------------------------------------------
-- Check 3: are gaps a problem for the routes that matter?
-- Result: 2,057 of 8,474 routes appear in all 29 quarters,
-- and those routes carry 89.3% of all passengers.
-- 7,374 gaps happen outside 2020-2021; the longest gap is 28 quarters.
-- ---------------------------------------------------------------------
with with_prev as (
    select
        route_id,
        covid_flag,
        period_index - lag(period_index) over (partition by route_id order by period_index) as gap
    from route_quarters
),
per_route as (
    select route_id, count(*) as quarters_present
    from route_quarters
    group by route_id
)
select
    (select count(*) from per_route where quarters_present = 29)                 as routes_all_29_quarters,
    (select count(*) from per_route)                                              as routes_total,
    (select count(*) from with_prev where gap > 1 and not covid_flag)             as gaps_outside_covid_years,
    (select max(gap) from with_prev)                                              as longest_gap_quarters,
    (select round(100.0 * sum(r.passengers) / (select sum(passengers) from route_quarters), 1)
       from route_quarters r
       join per_route p using (route_id)
      where p.quarters_present = 29)                                              as pct_passengers_full_history;
