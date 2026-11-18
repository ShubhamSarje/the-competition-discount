-- =====================================================================
-- 05_entry_effect.sql  |  The Competition Discount
-- Business question 2, part 2: when a low-cost airline becomes the cheapest
-- option, what happens to fares, passengers and revenue?
--
-- Method (difference-in-differences):
--   change on the entry route (after vs before)
--   MINUS the median change on CONTROL routes over the same 9 quarters
--   Control route = same distance band, present in all 9 quarters (t-4..t+4),
--                   cheapest airline full-service in every one of them, no COVID quarter.
-- This removes market-wide moves (fuel, demand, inflation) from the result.
-- Requires: 04_entry_events.sql (the entry_events view).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Part 1: the entry effect by distance band (medians across events)
-- Result (193 events, 305+ control routes per band and quarter):
--   band        fare     passengers   route revenue   dominant-airline revenue   dominant share
--   0-500      -4.8%      +14.4%         +4.2%              -1.3%                   -4.6 pts
--   500-1000  -13.8%      +27.8%         +9.3%              -9.8%                   -4.9 pts
--   1000-1500  -4.8%       +5.9%         +0.8%             -11.0%                   -3.3 pts
--   1500+      -1.2%       -0.2%         +0.7%              -9.0%                   -5.1 pts
--   ALL        -3.7%       +7.3%         +2.5%              -9.0%                   -4.6 pts
-- Reading: the route's total market grows, but the top airline's slice shrinks.
-- ---------------------------------------------------------------------
with entry_quarters as (
    select distinct entry_q from entry_events
),
control_routes as (
    select
        q.entry_q,
        r.route_id,
        min(r.distance_band)                                                          as distance_band,
        avg(r.fare)               filter (where r.period_index < q.entry_q)          as pre_fare,
        avg(r.fare)               filter (where r.period_index > q.entry_q)          as post_fare,
        avg(r.passengers)         filter (where r.period_index < q.entry_q)          as pre_pax,
        avg(r.passengers)         filter (where r.period_index > q.entry_q)          as post_pax,
        avg(r.est_route_rev_q)    filter (where r.period_index < q.entry_q)          as pre_route_rev,
        avg(r.est_route_rev_q)    filter (where r.period_index > q.entry_q)          as post_route_rev,
        avg(r.est_dominant_rev_q) filter (where r.period_index < q.entry_q)          as pre_dominant_rev,
        avg(r.est_dominant_rev_q) filter (where r.period_index > q.entry_q)          as post_dominant_rev
    from entry_quarters q
    join route_quarters r
      on r.period_index between q.entry_q - 4 and q.entry_q + 4
    group by q.entry_q, r.route_id
    having count(*) = 9                                   -- present in all 9 quarters
       and bool_and(r.low_group = 'full_service')         -- never a low-cost cheapest airline
       and not bool_or(r.covid_flag)
),
control_medians as (
    select
        entry_q,
        distance_band,
        count(*)                                                                         as n_control,
        percentile_cont(0.5) within group (order by post_fare / pre_fare - 1)            as c_fare,
        percentile_cont(0.5) within group (order by post_pax / pre_pax - 1)              as c_pax,
        percentile_cont(0.5) within group (order by post_route_rev / pre_route_rev - 1)  as c_route_rev,
        percentile_cont(0.5) within group (order by post_dominant_rev / pre_dominant_rev - 1) as c_dominant_rev
    from control_routes
    group by entry_q, distance_band
),
scored as (
    select
        e.*,
        c.n_control,
        (e.post_fare / e.pre_fare - 1)                 - c.c_fare          as effect_fare,
        (e.post_pax / e.pre_pax - 1)                   - c.c_pax           as effect_pax,
        (e.post_route_rev / e.pre_route_rev - 1)       - c.c_route_rev     as effect_route_rev,
        (e.post_dominant_rev / e.pre_dominant_rev - 1) - c.c_dominant_rev  as effect_dominant_rev,
        e.post_dominant_share - e.pre_dominant_share                       as change_dominant_share
    from entry_events e
    join control_medians c using (entry_q, distance_band)
)
select
    coalesce(distance_band, 'ALL')                                                                as distance_band,
    count(*)                                                                                      as events,
    min(n_control)                                                                                as min_control_routes,
    round(100 * percentile_cont(0.5) within group (order by effect_fare)::numeric, 1)            as fare_effect_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_pax)::numeric, 1)             as passenger_effect_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_route_rev)::numeric, 1)       as route_revenue_effect_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_dominant_rev)::numeric, 1)    as dominant_revenue_effect_pct,
    round(100 * percentile_cont(0.5) within group (order by change_dominant_share)::numeric, 1)  as dominant_share_change_pts
from scored
group by rollup (distance_band)                       -- ROLLUP adds the 'ALL' total row
order by array_position(array['0-500', '500-1000', '1000-1500', '1500+'], distance_band) nulls last;


-- ---------------------------------------------------------------------
-- Part 2: the incumbent's own revenue, only where the same airline stayed on top
-- Why: "dominant-airline revenue" after entry can belong to a DIFFERENT airline
-- if the top spot changed hands. These 89 events keep one airline throughout,
-- so the figure is that airline's own revenue. It is conservative: it leaves out
-- the cases where the incumbent lost the top spot.
-- Result: median -5.4% (middle half of events: -14.3% to +3.7%).
--         Route revenue across all 193 events: middle half -4.4% to +13.0%.
-- This -5.4% is the input to revenue at risk in 06_watchlist.sql.
-- ---------------------------------------------------------------------
with entry_quarters as (
    select distinct entry_q from entry_events
),
control_routes as (
    select
        q.entry_q,
        r.route_id,
        min(r.distance_band)                                                 as distance_band,
        avg(r.est_dominant_rev_q) filter (where r.period_index < q.entry_q) as pre_dominant_rev,
        avg(r.est_dominant_rev_q) filter (where r.period_index > q.entry_q) as post_dominant_rev
    from entry_quarters q
    join route_quarters r
      on r.period_index between q.entry_q - 4 and q.entry_q + 4
    group by q.entry_q, r.route_id
    having count(*) = 9
       and bool_and(r.low_group = 'full_service')
       and not bool_or(r.covid_flag)
),
control_medians as (
    select entry_q, distance_band,
           percentile_cont(0.5) within group (order by post_dominant_rev / pre_dominant_rev - 1) as c_dominant_rev
    from control_routes
    group by entry_q, distance_band
)
select
    count(*)                                                                                                   as same_dominant_events,
    round(100 * percentile_cont(0.5)  within group (order by e.post_dominant_rev / e.pre_dominant_rev - 1 - c.c_dominant_rev)::numeric, 1) as incumbent_revenue_effect_pct,
    round(100 * percentile_cont(0.25) within group (order by e.post_dominant_rev / e.pre_dominant_rev - 1 - c.c_dominant_rev)::numeric, 1) as p25_pct,
    round(100 * percentile_cont(0.75) within group (order by e.post_dominant_rev / e.pre_dominant_rev - 1 - c.c_dominant_rev)::numeric, 1) as p75_pct
from entry_events e
join control_medians c using (entry_q, distance_band)
where e.n_dominant_airlines = 1;
